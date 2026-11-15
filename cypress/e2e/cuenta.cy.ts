import { TODAY, USER_ID } from '../support/backend';

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
});
