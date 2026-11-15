import { TODAY } from '../support/backend';

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
});
