import { NOW, TODAY, USER_ID } from '../support/backend';

const PASSWORD = ['Clave', 'Segura', '123'].join('');

describe('Cuenta (extremo a extremo)', () => {
  describe('pantalla Cuenta', () => {
    it('sin cuenta: desde el botón de perfil ve que sus datos viven solo en el móvil', () => {
      cy.boot();
      cy.get('app-profile-button a[aria-label="Cuenta"]').click();
      cy.location('pathname').should('eq', '/cuenta');
      cy.contains('app-account-header h1', 'Cuenta').should('be.visible');
      cy.contains('Tus datos viven solo en este móvil').should('be.visible');
      cy.contains('ALMACENAMIENTO LOCAL ACTIVO').should('be.visible');
      cy.contains('a', 'Crear cuenta gratuita').should('have.attr', 'href', '/cuenta/crear');
      cy.contains('a', 'Ya tengo cuenta, iniciar sesión').should(
        'have.attr',
        'href',
        '/cuenta/entrar'
      );
      cy.contains('La cuenta es opcional y no necesita correo electrónico.').should('be.visible');
      cy.contains('AJUSTES DE CUENTA').should('not.exist');
    });

    it('sin cuenta: el botón atrás vuelve a la lista', () => {
      cy.boot({ path: '/cuenta' });
      cy.get('app-account-header button.back').click();
      cy.location('pathname').should('eq', '/');
      cy.contains('h1', 'Tareas').should('be.visible');
    });

    it('con cuenta: muestra el usuario, sus datos, los ajustes y la zona de peligro', () => {
      cy.boot({
        seed: (b) => {
          const id = b.addAccount('carlos_ritmo', PASSWORD);
          b.seed({ title: 'Comprar pan', user_id: id, due_date: TODAY });
        },
        signedInAs: 'carlos_ritmo',
      }).then((backend) => {
        cy.contains('.title', 'Comprar pan').should('be.visible');
        cy.get('app-profile-button a').click();
        cy.contains('.username', '@carlos_ritmo').should('be.visible');
        cy.contains('Tus tareas y tu XP están guardados en tu cuenta').should('be.visible');
        cy.contains('a.row', 'Cambiar contraseña').should(
          'have.attr',
          'href',
          '/cuenta/contrasena'
        );
        cy.contains('button.row', 'Cerrar sesión').should('be.visible');
        cy.contains('ZONA DE PELIGRO').should('be.visible');
        cy.contains('a', 'Borrar cuenta y datos').should('have.attr', 'href', '/cuenta/borrar');
        cy.contains('Cambiar nombre de usuario').should('not.exist');
        cy.wrap(null).should(() => expect(backend.signups).to.eq(0));
      });
    });
  });

  describe('cerrar sesión', () => {
    const boot = () =>
      cy.boot({
        path: '/cuenta',
        seed: (b) => {
          const id = b.addAccount('carlos_ritmo', PASSWORD);
          b.seed({ title: 'Comprar pan', user_id: id, due_date: TODAY });
        },
        signedInAs: 'carlos_ritmo',
      });

    it('cierra, avisa, deja la lista vacía y sin cuenta; los datos siguen en el servidor', () => {
      boot().then((backend) => {
        cy.contains('button.row', 'Cerrar sesión').click();
        cy.get('[role="alertdialog"]')
          .should('be.visible')
          .and('contain', '¿Cerrar sesión?')
          .and('contain', 'Tus tareas y tu progreso permanecerán guardados en tu cuenta');
        cy.contains('[role="alertdialog"] button', 'Sí, cerrar sesión').click();

        cy.location('pathname').should('eq', '/');
        cy.contains('[role="status"]', 'Sesión cerrada').should('be.visible');
        cy.contains('h2', 'Todo despejado por aquí').should('be.visible');
        cy.contains('Comprar pan').should('not.exist');

        cy.wrap(null).should(() => {
          expect(backend.logouts).to.eq(1);
          expect(backend.signups).to.eq(1); // sesión anónima nueva
          expect(backend.byTitle('Comprar pan')).to.not.eq(undefined);
        });

        cy.get('app-profile-button a').click();
        cy.contains('Tus datos viven solo en este móvil').should('be.visible');
        cy.contains('.username').should('not.exist');
      });
    });

    it('«Cancelar» cierra el diálogo y no toca la sesión', () => {
      boot().then((backend) => {
        cy.contains('button.row', 'Cerrar sesión').click();
        cy.contains('[role="alertdialog"] button', 'Cancelar').click();
        cy.get('[role="alertdialog"]').should('not.exist');
        cy.contains('.username', '@carlos_ritmo').should('be.visible');
        cy.wrap(null).should(() => expect(backend.logouts).to.eq(0));
      });
    });

    it('el botón atrás de Android cierra el diálogo sin salir de la pantalla', () => {
      boot();
      cy.contains('button.row', 'Cerrar sesión').click();
      cy.get('[role="alertdialog"]').should('be.visible');
      cy.go('back');
      cy.get('[role="alertdialog"]').should('not.exist');
      cy.location('pathname').should('eq', '/cuenta');
      cy.contains('.username', '@carlos_ritmo').should('be.visible');
    });

    const setOnline = (online: boolean) =>
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', { value: online, configurable: true });
      });

    it('sin conexión explica el motivo, no cierra nada y permite reintentar al volver la red', () => {
      boot().then((backend) => {
        setOnline(false);
        cy.contains('button.row', 'Cerrar sesión').click();
        cy.contains('[role="alertdialog"] button', 'Sí, cerrar sesión').click();
        cy.get('[role="alertdialog"] .error').should('contain', 'Sin conexión a Internet');
        cy.location('pathname').should('eq', '/cuenta');
        cy.wrap(null).should(() => {
          expect(backend.logouts).to.eq(0);
          expect(backend.signups).to.eq(0);
        });

        setOnline(true);
        cy.contains('[role="alertdialog"] button', 'Sí, cerrar sesión').click();
        cy.location('pathname').should('eq', '/');
        cy.contains('h2', 'Todo despejado por aquí').should('be.visible');
      });
    });

    it('si el servidor no responde al revocar, la sesión de este móvil se cierra igualmente', () => {
      boot().then((backend) => {
        backend.fail('logout', 1, true);
        cy.contains('button.row', 'Cerrar sesión').click();
        cy.contains('[role="alertdialog"] button', 'Sí, cerrar sesión').click();
        cy.location('pathname').should('eq', '/');
        cy.contains('h2', 'Todo despejado por aquí').should('be.visible');
        cy.wrap(null).should(() => expect(backend.signups).to.eq(1));
      });
    });
  });

  describe('crear cuenta', () => {
    const field = (index: number) => cy.get('app-account-field').eq(index);
    const typeIn = (index: number, text: string) =>
      field(index).find('input.input').clear().type(text);
    const fillValid = (name = 'carlos_ritmo') => {
      typeIn(0, name);
      typeIn(1, PASSWORD);
      typeIn(2, PASSWORD);
    };
    const accept = () => cy.get('input.accept').check({ force: true });
    const submit = () => cy.get('button.submit');

    it('las reglas y el contador cambian en vivo, y el botón espera a todo válido y a la casilla', () => {
      cy.boot({ path: '/cuenta/crear' });
      submit().should('be.disabled');
      field(0).contains('0/24').should('be.visible');
      field(0).find('li[data-state="idle"]').should('have.length', 2);

      typeIn(0, 'ab');
      field(0).contains('2/24').should('be.visible');
      field(0).find('li[data-state="error"]').should('have.length', 1);
      field(0).find('li[data-state="ok"]').should('have.length', 1);
      typeIn(0, 'carlos_ritmo');
      field(0).find('li[data-state="ok"]').should('have.length', 2);

      typeIn(1, PASSWORD);
      field(1).find('li[data-state="ok"]').should('have.length', 2);
      typeIn(2, 'otra');
      field(2).contains('No coinciden').should('be.visible');
      typeIn(2, PASSWORD);
      field(2).contains('Coinciden').should('be.visible');

      submit().should('be.disabled'); // falta la casilla
      accept();
      submit().should('be.enabled');
      typeIn(2, 'otra');
      submit().should('be.disabled');
    });

    it('los mensajes de error aparecen al perder el foco', () => {
      cy.boot({ path: '/cuenta/crear' });
      typeIn(0, 'ab').blur();
      field(0).contains('El formato de usuario no es válido.').should('be.visible');
      typeIn(1, 'corta').blur();
      field(1).contains('La contraseña debe cumplir con los requisitos.').should('be.visible');
    });

    it('muestra y oculta la contraseña', () => {
      cy.boot({ path: '/cuenta/crear' });
      typeIn(1, PASSWORD);
      field(1).find('input.input').should('have.attr', 'type', 'password');
      field(1).find('button.toggle').click();
      field(1).find('input.input').should('have.attr', 'type', 'text');
    });

    it('crea la cuenta conservando tareas y XP: mismo usuario, aviso y sesión tras recargar', () => {
      cy.boot({
        seed: (b) => {
          b.seedCompleted('Tarea hecha', TODAY);
          b.seed({ title: 'Pendiente de ejemplo', due_date: TODAY });
        },
      }).then((backend) => {
        cy.contains('.title', 'Pendiente de ejemplo').should('be.visible');
        cy.get('app-profile-button a').click();
        cy.contains('a', 'Crear cuenta gratuita').click();
        cy.location('pathname').should('eq', '/cuenta/crear');

        fillValid();
        accept();
        submit().click();

        cy.location('pathname').should('eq', '/cuenta');
        cy.contains('[role="status"]', '¡Cuenta creada con éxito!').should('be.visible');
        cy.contains('[role="status"]', 'Tus tareas y tu progreso siguen aquí.').should(
          'be.visible'
        );
        cy.contains('.username', '@carlos_ritmo').should('be.visible');

        cy.wrap(null).should(() => {
          const account = backend.accountByName('carlos_ritmo');
          expect(account?.id).to.eq(USER_ID); // vinculada a la misma identidad
          expect(backend.signups).to.eq(1);
          expect(backend.totalXp(USER_ID)).to.eq(10);
        });

        cy.reload();
        cy.contains('.username', '@carlos_ritmo').should('be.visible'); // la cuenta sobrevive al recargar
        cy.get('app-account-header button.back').click();
        cy.contains('.title', 'Pendiente de ejemplo').should('be.visible');
        cy.wrap(null).should(() => expect(backend.signups).to.eq(1));
      });
    });

    it('nombre ocupado: lo indica y conserva lo escrito; al cambiarlo se puede crear', () => {
      cy.boot({
        path: '/cuenta/crear',
        seed: (b) => {
          b.addAccount('carlos_ritmo', PASSWORD);
        },
      });
      fillValid();
      accept();
      submit().click();

      field(0).contains('Nombre de usuario no disponible').should('be.visible');
      field(0).find('input.input').should('have.value', 'carlos_ritmo');
      field(1).find('input.input').should('have.value', PASSWORD);
      cy.location('pathname').should('eq', '/cuenta/crear');

      typeIn(0, 'carlos_ritmo_2');
      field(0).contains('Nombre de usuario no disponible').should('not.exist');
      submit().click();
      cy.location('pathname').should('eq', '/cuenta');
      cy.contains('.username', '@carlos_ritmo_2').should('be.visible');
    });

    it('sin conexión: banner con «Reintentar ahora», conserva lo escrito y no crea nada hasta reintentar', () => {
      cy.boot({ path: '/cuenta/crear' }).then((backend) => {
        // La librería reintenta sola los fallos de red: la caída dura varias peticiones.
        backend.fail('link', 50, true);
        fillValid();
        accept();
        submit().click();

        cy.contains('app-offline-banner', 'Sin conexión a Internet').should('be.visible');
        field(0).find('input.input').should('have.value', 'carlos_ritmo');
        cy.location('pathname').should('eq', '/cuenta/crear');
        cy.wrap(null).should(() => expect(backend.accountByName('carlos_ritmo')).to.eq(undefined));

        cy.wrap(null).then(() => backend.fail('link', 0)); // vuelve la red
        cy.contains('app-offline-banner button', 'Reintentar ahora').click();
        cy.location('pathname').should('eq', '/cuenta');
        cy.contains('.username', '@carlos_ritmo').should('be.visible');
      });
    });

    it('«Cancelar y volver» regresa a Cuenta sin crear nada', () => {
      cy.boot({ path: '/cuenta/crear' }).then((backend) => {
        fillValid();
        cy.contains('button.cancel', 'Cancelar y volver').click();
        cy.location('pathname').should('eq', '/cuenta');
        cy.contains('Tus datos viven solo en este móvil').should('be.visible');
        cy.wrap(null).should(() => expect(backend.accounts).to.have.length(0));
      });
    });
  });

  describe('iniciar sesión', () => {
    const typeIn = (index: number, text: string) =>
      cy.get('app-account-field').eq(index).find('input.input').clear().type(text);
    const login = (name = 'ana', password = PASSWORD) => {
      typeIn(0, name);
      typeIn(1, password);
      cy.get('button.submit').click();
    };
    const sheetButton = (text: string) => cy.contains('app-local-tasks-sheet button', text);

    /** Una cuenta «ana» con dos tareas (una completada que da XP) y un móvil anónimo con sus tareas. */
    const seedAccount = (
      b: import('../support/backend').FakeBackend,
      local: { pending: string[]; completed: string[] }
    ) => {
      const id = b.addAccount('ana', PASSWORD);
      b.seed({ title: 'De la cuenta', user_id: id, due_date: TODAY });
      b.seed({
        title: 'Cuenta hecha',
        user_id: id,
        completed_at: '2026-11-14T08:00:00.000Z',
        completed_day: TODAY,
      });
      local.pending.forEach((title) => b.seed({ title, due_date: TODAY }));
      local.completed.forEach((title) => b.seedCompleted(title, TODAY));
      return id;
    };

    it('credenciales incorrectas: aviso genérico, conserva lo escrito y no cambia nada', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: ['Pendiente local'], completed: [] }),
      }).then((backend) => {
        login('ana', 'otra-clave-1');
        cy.contains('[role="alert"]', 'Acceso no válido').should('be.visible');
        cy.contains('Nombre de usuario o contraseña incorrectos').should('be.visible');
        cy.get('app-account-field').eq(0).find('input.input').should('have.value', 'ana');
        cy.location('pathname').should('eq', '/cuenta/entrar');
        cy.wrap(null).should(() => expect(backend.signups).to.eq(1));

        login('no_existe', PASSWORD); // un usuario inexistente da exactamente el mismo aviso
        cy.contains('[role="alert"]', 'Nombre de usuario o contraseña incorrectos').should(
          'be.visible'
        );
      });
    });

    it('demasiados intentos: lo explica con el mismo bloque', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: [], completed: [] }),
      }).then((backend) => {
        backend.fail('rate-limit', 1);
        login();
        cy.contains('[role="alert"]', 'Demasiados intentos. Espera unos minutos.').should(
          'be.visible'
        );
        cy.location('pathname').should('eq', '/cuenta/entrar');
      });
    });

    it('sin tareas locales entra directo: ve las de su cuenta y ninguna ajena', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: [], completed: [] }),
      });
      login();
      cy.location('pathname').should('eq', '/');
      cy.contains('[role="status"]', 'Sesión iniciada').should('be.visible');
      cy.contains('.title', 'De la cuenta').should('be.visible');
      cy.get('app-profile-button a').click();
      cy.contains('.username', '@ana').should('be.visible');
    });

    it('con pendientes pregunta y «traer» las recrea en la cuenta, sin XP ni completadas', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) =>
          void seedAccount(b, {
            pending: ['Pendiente A', 'Pendiente B'],
            completed: ['Hecha local'],
          }),
      }).then((backend) => {
        const accountId = backend.accountByName('ana')?.id as string;
        const xpBefore = backend.totalXp(accountId);
        login();

        cy.get('app-local-tasks-sheet [role="dialog"]').should('be.visible');
        cy.contains('.count-text', '2 tareas locales sin cuenta').should('be.visible');
        cy.contains('Nota: El XP y las tareas ya completadas de este móvil no se sumarán.').should(
          'be.visible'
        );
        cy.location('pathname').should('eq', '/cuenta/entrar');

        sheetButton('Traer tareas y continuar').click();
        cy.location('pathname').should('eq', '/');
        cy.contains('[role="status"]', 'Tareas añadidas a tu cuenta').should('be.visible');
        cy.contains('.title', 'Pendiente A').should('be.visible');
        cy.contains('.title', 'Pendiente B').should('be.visible');
        cy.contains('.title', 'De la cuenta').should('be.visible');
        cy.contains('.title', 'Hecha local').should('not.exist');

        cy.wrap(null).should(() => {
          const titles = backend.tasksOf(accountId).map((t) => t.title);
          expect(titles).to.include.members(['De la cuenta', 'Pendiente A', 'Pendiente B']);
          expect(titles).to.not.include('Hecha local');
          expect(backend.totalXp(accountId)).to.eq(xpBefore); // el XP del móvil no se suma
          expect(backend.byTitle('Pendiente A')?.xp_awarded).to.eq(0);
        });
      });
    });

    it('«traer» conserva la repetición de una pendiente que es una serie (spec 012)', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => {
          seedAccount(b, { pending: [], completed: [] });
          const series = b.seedSeries({
            title: 'Gimnasio',
            kind: 'weekly',
            weekdays: [1, 4],
            start_date: '2026-11-09',
          });
          b.seed({
            title: 'Gimnasio',
            due_date: '2026-11-16',
            series_id: series.id,
            series_date: '2026-11-12',
          });
        },
      }).then((backend) => {
        const accountId = backend.accountByName('ana')?.id as string;
        login();
        sheetButton('Traer tareas y continuar').click();

        cy.location('pathname').should('eq', '/');
        cy.contains('.group .repeat', 'Lun, jue').should('be.visible');
        cy.wrap(null).should(() => {
          const [series] = backend.seriesOf(accountId);
          expect(series.kind).to.eq('weekly');
          expect(series.weekdays).to.deep.eq([1, 4]);
          expect(series.start_date).to.eq('2026-11-09');
          const [pending] = backend.pendingOf(series.id);
          expect(pending.user_id).to.eq(accountId);
          expect(pending.due_date).to.eq('2026-11-16');
          expect(pending.series_date).to.eq('2026-11-12');
        });
      });
    });

    it('«usar solo mi cuenta» pide confirmar, descarta las del móvil y entra', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: ['Pendiente A'], completed: [] }),
      }).then((backend) => {
        login();
        sheetButton('Usar solo mi cuenta').click();
        cy.get('app-discard-confirm [role="alertdialog"]')
          .should('be.visible')
          .and('contain', '¿Descartar tareas de este móvil?')
          .and('contain', 'Esta acción no se puede deshacer');
        cy.get('app-local-tasks-sheet').should('exist'); // la hoja sigue debajo

        cy.contains('app-discard-confirm button', 'Sí, descartar tareas locales').click();
        cy.location('pathname').should('eq', '/');
        cy.contains('[role="status"]', 'Sesión iniciada').should('be.visible');
        cy.contains('.title', 'De la cuenta').should('be.visible');
        cy.contains('.title', 'Pendiente A').should('not.exist');
        cy.wrap(null).should(() => {
          const accountId = backend.accountByName('ana')?.id as string;
          expect(backend.tasksOf(accountId).map((t) => t.title)).to.not.include('Pendiente A');
        });
      });
    });

    it('«Volver a opciones» cierra la confirmación y deja la hoja', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: ['Pendiente A'], completed: [] }),
      });
      login();
      sheetButton('Usar solo mi cuenta').click();
      cy.contains('app-discard-confirm button', 'Volver a opciones').click();
      cy.get('app-discard-confirm').should('not.exist');
      cy.get('app-local-tasks-sheet [role="dialog"]').should('be.visible');
    });

    it('cancelar deja la sesión anónima y sus tareas intactas', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: ['Pendiente A'], completed: [] }),
      }).then((backend) => {
        login();
        sheetButton('Cancelar inicio de sesión').click();
        cy.get('app-local-tasks-sheet').should('not.exist');
        cy.location('pathname').should('eq', '/cuenta/entrar');
        cy.get('app-account-header button.back').click();
        cy.contains('Tus datos viven solo en este móvil').should('be.visible'); // sigue sin cuenta
        cy.get('app-account-header button.back').click();
        cy.contains('.title', 'Pendiente A').should('be.visible');
        cy.wrap(null).should(() => {
          expect(backend.signups).to.eq(1);
          expect(backend.byTitle('Pendiente A')?.user_id).to.eq(USER_ID);
        });
      });
    });

    it('el botón atrás de Android cierra la hoja y cancela la entrada', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: ['Pendiente A'], completed: [] }),
      });
      login();
      cy.get('app-local-tasks-sheet [role="dialog"]').should('be.visible');
      cy.go('back');
      cy.get('app-local-tasks-sheet').should('not.exist');
      cy.location('pathname').should('eq', '/cuenta/entrar');
    });

    it('solo completadas en el móvil: confirmación derivada y se entra sin ellas', () => {
      cy.boot({
        path: '/cuenta/entrar',
        seed: (b) => void seedAccount(b, { pending: [], completed: ['Hecha local'] }),
      });
      login();
      cy.get('app-local-tasks-sheet').should('not.exist');
      cy.contains('app-discard-confirm h2', '¿Continuar sin las tareas de este móvil?').should(
        'be.visible'
      );
      cy.contains('app-discard-confirm button', 'Sí, continuar').click();
      cy.location('pathname').should('eq', '/');
      cy.contains('.title', 'De la cuenta').should('be.visible');
      cy.contains('.title', 'Hecha local').should('not.exist');
    });

    it('los datos de la cuenta reaparecen al cerrar sesión y volver a entrar', () => {
      cy.boot({
        seed: (b) => {
          const id = b.addAccount('ana', PASSWORD);
          b.seed({ title: 'De la cuenta', user_id: id, due_date: TODAY });
        },
        signedInAs: 'ana',
      });
      cy.get('app-profile-button a').click();
      cy.contains('button.row', 'Cerrar sesión').click();
      cy.contains('[role="alertdialog"] button', 'Sí, cerrar sesión').click();
      cy.contains('h2', 'Todo despejado por aquí').should('be.visible');
      cy.contains('.title', 'De la cuenta').should('not.exist');

      cy.get('app-profile-button a').click();
      cy.contains('a', 'Ya tengo cuenta, iniciar sesión').click();
      login();
      cy.location('pathname').should('eq', '/');
      cy.contains('.title', 'De la cuenta').should('be.visible');
    });
  });

  describe('recordatorio de cuenta', () => {
    const done = (title: string) => `button.check[aria-label="Marcar como hecha: ${title}"]`;
    const reminder = () => cy.get('app-account-reminder');
    const typeAccount = () => {
      cy.get('app-account-field').eq(0).find('input.input').type('carlos_ritmo');
      cy.get('app-account-field').eq(1).find('input.input').type(PASSWORD);
      cy.get('app-account-field').eq(2).find('input.input').type(PASSWORD);
      cy.get('input.accept').check({ force: true });
      cy.get('button.submit').click();
    };

    it('aparece al completar la primera tarea, con su texto y su acceso a Crear cuenta', () => {
      cy.boot({ seed: (b) => void b.seed({ title: 'Primera tarea', due_date: TODAY }) });
      cy.contains('.title', 'Primera tarea').should('be.visible');
      cy.get('app-account-reminder').should('not.exist'); // antes de completar nada no se ofrece

      cy.get(done('Primera tarea')).click();
      reminder().should('be.visible');
      reminder().contains('Asegura tu progreso').should('be.visible');
      reminder().contains('Crea tu respaldo personal').should('be.visible');
      reminder()
        .contains(
          'Tus datos solo están en este móvil. Crea una cuenta para no perderlos al cambiar de teléfono.'
        )
        .should('be.visible');
      reminder().contains('a', 'Crear cuenta').should('have.attr', 'href', '/cuenta/crear');
    });

    it('queda situada bajo el resumen de nivel y la lista sigue sin solapes', () => {
      cy.boot({ seed: (b) => void b.seedCompleted('Hecha antes', TODAY) });
      reminder().should('be.visible');
      cy.get('app-progress-summary').then(($summary) => {
        cy.get('app-account-reminder').then(($reminder) => {
          const summary = $summary[0].getBoundingClientRect();
          const card = $reminder[0].getBoundingClientRect();
          expect(card.top).to.be.at.least(summary.bottom);
        });
      });
    });

    it('el aspa la oculta y sigue oculta tras recargar', () => {
      cy.boot({ seed: (b) => void b.seedCompleted('Hecha antes', TODAY) });
      reminder().find('button.close').click();
      cy.get('app-account-reminder').should('not.exist');
      cy.reload();
      cy.contains('h1', 'Tareas').should('be.visible');
      cy.get('app-account-reminder').should('not.exist');
    });

    it('«En 14 días» la oculta y vuelve a los 14 días', () => {
      cy.boot({ seed: (b) => void b.seedCompleted('Hecha antes', TODAY) });
      reminder().contains('button', 'En 14 días').click();
      cy.get('app-account-reminder').should('not.exist');

      cy.clock().then((clock) => clock.restore());
      cy.clock(new Date(NOW.getTime() + 13 * 24 * 60 * 60 * 1000), ['Date']);
      cy.reload();
      cy.contains('h1', 'Tareas').should('be.visible');
      cy.get('app-account-reminder').should('not.exist'); // a los 13 días sigue aplazada

      cy.clock().then((clock) => clock.restore());
      cy.clock(new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000 + 1000), ['Date']);
      cy.reload();
      reminder().should('be.visible'); // a los 14 días vuelve
    });

    it('«Crear cuenta» del recordatorio lleva al formulario', () => {
      cy.boot({ seed: (b) => void b.seedCompleted('Hecha antes', TODAY) });
      reminder().contains('a', 'Crear cuenta').click();
      cy.location('pathname').should('eq', '/cuenta/crear');
    });

    it('con cuenta no se ofrece, aunque haya tareas completadas', () => {
      cy.boot({
        seed: (b) => {
          const id = b.addAccount('ana', PASSWORD);
          b.seed({
            title: 'Hecha',
            user_id: id,
            completed_at: '2026-11-14T08:00:00.000Z',
            completed_day: TODAY,
          });
        },
        signedInAs: 'ana',
      });
      cy.contains('h1', 'Tareas').should('be.visible');
      cy.get('app-account-reminder').should('not.exist');
    });

    it('tras crear la cuenta el recordatorio deja de salir', () => {
      cy.boot({ seed: (b) => void b.seedCompleted('Hecha antes', TODAY) });
      reminder().contains('a', 'Crear cuenta').click();
      typeAccount();
      cy.location('pathname').should('eq', '/cuenta');
      cy.get('app-account-header button.back').click();
      cy.contains('h1', 'Tareas').should('be.visible');
      cy.get('app-account-reminder').should('not.exist');
    });

    it('cambiar de identidad nunca deja ver datos ni celebraciones ajenos', () => {
      cy.boot({
        seed: (b) => {
          const id = b.addAccount('ana', PASSWORD);
          b.seed({ title: 'De la cuenta', user_id: id, due_date: TODAY });
          b.seed({ title: 'Del móvil', due_date: TODAY });
        },
      });
      cy.get(done('Del móvil')).click();
      cy.get('app-celebration .celebration').should('contain', '+10 XP');

      cy.get('app-profile-button a').click();
      cy.contains('a', 'Ya tengo cuenta, iniciar sesión').click();
      cy.get('app-account-field').eq(0).find('input.input').type('ana');
      cy.get('app-account-field').eq(1).find('input.input').type(PASSWORD);
      cy.get('button.submit').click();
      cy.contains('app-discard-confirm button', 'Sí, continuar').click(); // solo había una completada

      cy.location('pathname').should('eq', '/');
      cy.contains('.title', 'De la cuenta').should('be.visible');
      cy.contains('.title', 'Del móvil').should('not.exist');
      cy.get('app-celebration .celebration').should('not.exist'); // la celebración era de otra identidad
    });
  });

  describe('cambiar contraseña', () => {
    const NEXT = ['Nueva', 'Clave', '456'].join('');
    const boot = () =>
      cy.boot({
        path: '/cuenta/contrasena',
        seed: (b) => {
          const id = b.addAccount('ana', PASSWORD);
          b.seed({ title: 'De la cuenta', user_id: id, due_date: TODAY });
        },
        signedInAs: 'ana',
      });
    const typeIn = (index: number, text: string) =>
      cy.get('app-account-field').eq(index).find('input.input').clear().type(text);
    const fill = (current = PASSWORD, next = NEXT, repeat = NEXT) => {
      typeIn(0, current);
      typeIn(1, next);
      typeIn(2, repeat);
    };

    it('las reglas de la nueva y la repetición se ven en vivo, y el botón espera a todo válido', () => {
      boot();
      cy.get('button.submit').should('be.disabled');
      typeIn(0, PASSWORD);
      typeIn(1, 'corta');
      cy.get('app-account-field').eq(1).find('li[data-state="error"]').should('have.length', 1);
      typeIn(1, PASSWORD); // igual a la actual
      cy.get('app-account-field').eq(1).find('li[data-state="error"]').should('have.length', 1);
      cy.get('button.submit').should('be.disabled');
      typeIn(1, NEXT);
      cy.get('app-account-field').eq(1).find('li[data-state="ok"]').should('have.length', 3);
      typeIn(2, 'otra');
      cy.get('app-account-field').eq(2).contains('No coinciden').should('be.visible');
      cy.get('button.submit').should('be.disabled');
      typeIn(2, NEXT);
      cy.get('app-account-field').eq(2).contains('Coinciden').should('be.visible');
      cy.get('button.submit').should('be.enabled');
    });

    it('contraseña actual incorrecta: lo indica, conserva lo escrito y no cambia nada', () => {
      boot().then((backend) => {
        fill('otra-clave-1');
        cy.get('button.submit').click();
        cy.get('app-account-field')
          .eq(0)
          .contains('La contraseña actual no es correcta.')
          .should('be.visible');
        cy.get('app-account-field').eq(1).find('input.input').should('have.value', NEXT);
        cy.location('pathname').should('eq', '/cuenta/contrasena');
        cy.wrap(null).should(() => expect(backend.accountByName('ana')?.password).to.eq(PASSWORD));
      });
    });

    it('cambia la contraseña: aviso, vuelta a Cuenta, y la antigua deja de valer', () => {
      boot().then((backend) => {
        fill();
        cy.get('button.submit').click();

        cy.location('pathname').should('eq', '/cuenta');
        cy.contains('[role="status"]', 'Contraseña cambiada').should('be.visible');
        cy.contains('.username', '@ana').should('be.visible'); // la sesión sigue abierta
        cy.wrap(null).should(() => expect(backend.accountByName('ana')?.password).to.eq(NEXT));

        // Cerrar sesión y volver a entrar: la antigua falla, la nueva funciona
        cy.contains('button.row', 'Cerrar sesión').click();
        cy.contains('[role="alertdialog"] button', 'Sí, cerrar sesión').click();
        cy.get('app-profile-button a').click();
        cy.contains('a', 'Ya tengo cuenta, iniciar sesión').click();
        cy.get('app-account-field').eq(0).find('input.input').type('ana');
        cy.get('app-account-field').eq(1).find('input.input').type(PASSWORD);
        cy.get('button.submit').click();
        cy.contains('[role="alert"]', 'Acceso no válido').should('be.visible');

        cy.get('app-account-field').eq(1).find('input.input').clear().type(NEXT);
        cy.get('button.submit').click();
        cy.location('pathname').should('eq', '/');
        cy.contains('.title', 'De la cuenta').should('be.visible');
      });
    });

    it('sin conexión: banner, conserva lo escrito y reintenta al volver la red', () => {
      boot().then((backend) => {
        backend.fail('password', 50, true);
        fill();
        cy.get('button.submit').click();
        cy.contains('app-offline-banner', 'Sin conexión a Internet').should('be.visible');
        cy.get('app-account-field').eq(1).find('input.input').should('have.value', NEXT);
        cy.wrap(null).should(() => expect(backend.accountByName('ana')?.password).to.eq(PASSWORD));

        cy.wrap(null).then(() => backend.fail('password', 0));
        cy.contains('app-offline-banner button', 'Reintentar ahora').click();
        cy.location('pathname').should('eq', '/cuenta');
        cy.wrap(null).should(() => expect(backend.accountByName('ana')?.password).to.eq(NEXT));
      });
    });

    it('«Cancelar y volver» regresa a Cuenta sin cambiar nada', () => {
      boot().then((backend) => {
        fill();
        cy.contains('button.cancel', 'Cancelar y volver').click();
        cy.location('pathname').should('eq', '/cuenta');
        cy.wrap(null).should(() => expect(backend.accountByName('ana')?.password).to.eq(PASSWORD));
      });
    });
  });

  describe('borrar la cuenta', () => {
    const boot = () =>
      cy.boot({
        path: '/cuenta/borrar',
        seed: (b) => {
          const id = b.addAccount('ana', PASSWORD);
          b.seed({ title: 'De la cuenta', user_id: id, due_date: TODAY });
          b.seedCompleted('Hecha de la cuenta', TODAY);
          b.tasks[b.tasks.length - 1].user_id = id;
        },
        signedInAs: 'ana',
      });
    const typePassword = (text: string) =>
      cy.get('app-account-field').find('input.input').clear().type(text);
    const accept = () => cy.get('input.accept').check({ force: true });

    it('muestra el peligro y el botón espera a la contraseña y a la casilla', () => {
      boot();
      cy.contains('.danger-title', 'Borrar cuenta permanentemente').should('be.visible');
      cy.get('button.submit').should('be.disabled');
      typePassword(PASSWORD);
      cy.get('button.submit').should('be.disabled');
      accept();
      cy.get('button.submit').should('be.enabled');
    });

    it('contraseña incorrecta: lo indica y no se borra nada', () => {
      boot().then((backend) => {
        typePassword('otra-clave-1');
        accept();
        cy.get('button.submit').click();
        cy.contains('La contraseña no es correcta.').should('be.visible');
        cy.location('pathname').should('eq', '/cuenta/borrar');
        cy.wrap(null).should(() => {
          expect(backend.accountByName('ana')).to.not.eq(undefined);
          expect(backend.byTitle('De la cuenta')).to.not.eq(undefined);
        });
      });
    });

    it('si el servidor falla: «No se ha borrado nada» y se puede reintentar', () => {
      boot().then((backend) => {
        backend.fail('delete-account', 50, true);
        typePassword(PASSWORD);
        accept();
        cy.get('button.submit').click();
        cy.contains('[role="alert"]', 'No se ha borrado nada. Inténtalo de nuevo.').should(
          'be.visible'
        );
        cy.wrap(null).should(() => expect(backend.accountByName('ana')).to.not.eq(undefined));

        cy.wrap(null).then(() => backend.fail('delete-account', 0));
        cy.get('button.submit').click();
        cy.location('pathname').should('eq', '/');
      });
    });

    it('borra la cuenta y sus datos, deja una sesión anónima nueva y vacía, y avisa', () => {
      boot().then((backend) => {
        const id = backend.accountByName('ana')?.id as string;
        typePassword(PASSWORD);
        accept();
        cy.get('button.submit').click();

        cy.location('pathname').should('eq', '/');
        cy.contains('[role="status"]', 'Cuenta eliminada').should('be.visible');
        cy.contains('h2', 'Todo despejado por aquí').should('be.visible');
        cy.contains('.title', 'De la cuenta').should('not.exist');

        cy.wrap(null).should(() => {
          expect(backend.accountByName('ana')).to.eq(undefined);
          expect(backend.tasksOf(id)).to.have.length(0);
          expect(backend.totalXp(id)).to.eq(0);
          expect(backend.signups).to.eq(1); // sesión anónima nueva
        });

        cy.get('app-profile-button a').click();
        cy.contains('Tus datos viven solo en este móvil').should('be.visible'); // vuelve a ser anónimo
        cy.contains('.username').should('not.exist');
      });
    });

    it('«Cancelar y volver» regresa a Cuenta sin borrar nada', () => {
      boot().then((backend) => {
        typePassword(PASSWORD);
        cy.contains('button.cancel', 'Cancelar y volver').click();
        cy.location('pathname').should('eq', '/cuenta');
        cy.wrap(null).should(() => expect(backend.accountByName('ana')).to.not.eq(undefined));
      });
    });
  });
});
