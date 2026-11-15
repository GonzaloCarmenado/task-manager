import { TODAY } from '../support/backend';

const done = (title: string) => `button.check[aria-label="Marcar como hecha: ${title}"]`;

describe('Fallos del servidor y de la red (extremo a extremo)', () => {
  it('si no cargan las tareas se ve el error y Reintentar las recupera', () => {
    cy.boot({
      seed: (b) => {
        b.seed({ title: 'Recuperada' });
        b.fail('load');
      },
    }).then((backend) => {
      cy.contains('[role="alert"] h2', 'No pudimos cargar tus tareas').should('be.visible');
      cy.contains('button', 'Reintentar').click();
      cy.contains('.title', 'Recuperada').should('be.visible');
      cy.get('[role="alert"]').should('not.exist');
      cy.wrap(null).should(() => expect(backend.count('GET', '/rest/v1/tasks')).to.eq(2));
    });
  });

  it('sin red al cargar también muestra el error con Reintentar (el cliente reintenta solo antes de rendirse)', () => {
    cy.boot({
      seed: (b) => {
        b.seed({ title: 'Tras la red' });
        b.fail('load', 50, true);
      },
    }).then((backend) => {
      cy.contains('h2', 'No pudimos cargar tus tareas', { timeout: 20_000 }).should('be.visible');
      cy.contains('Revisa tu conexión').should('be.visible');
      cy.then(() => backend.fail('load', 0));
      cy.contains('button', 'Reintentar').click();
      cy.contains('.title', 'Tras la red').should('be.visible');
    });
  });

  it('si falla el guardado, el formulario sigue con lo escrito, avisa y permite reintentar', () => {
    cy.boot({ path: '/nueva' }).then((backend) => {
      backend.fail('create');
      cy.get('#task-title').type('No se pierde');
      cy.get('button.save').click();
      cy.get('.form-error[role="alert"]').should('contain', 'No se pudo guardar la tarea');
      cy.location('pathname').should('eq', '/nueva');
      cy.get('#task-title').should('have.value', 'No se pierde');
      cy.get('button.save').should('not.be.disabled').click();
      cy.location('pathname').should('eq', '/');
      cy.contains('.title', 'No se pierde').should('be.visible');
      cy.wrap(null).should(() => expect(backend.tasks).to.have.length(1));
    });
  });

  it('si falla completar, la tarea vuelve a pendientes, avisa y no hay XP inventados', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'No se completa', due_date: TODAY }) }).then(
      (backend) => {
        backend.fail('update');
        cy.get(done('No se completa')).click();
        cy.get('.notice.error').should('contain', 'No se pudo guardar el cambio');
        cy.contains('.group[data-kind="today"] .title', 'No se completa').should('be.visible');
        cy.get('app-celebration').should('not.exist');
        cy.get('app-progress-summary').should('contain', '0 / 50 XP');
        cy.wrap(null).should(() => {
          expect(backend.byTitle('No se completa')?.completed_at).to.eq(null);
          expect(backend.totalXp()).to.eq(0);
        });
      }
    );
  });

  it('si falla borrar, la tarea vuelve y se avisa', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Resiste' }) }).then((backend) => {
      backend.fail('delete');
      cy.contains('.task .open', 'Resiste').click();
      cy.contains('button.delete', 'Borrar tarea').click();
      cy.contains('button.confirm', 'Sí, borrar').click();
      cy.get('.form-error[role="alert"]').should('contain', 'No se pudo borrar la tarea');
      cy.location('pathname').should('not.eq', '/');
      cy.wrap(null).should(() => expect(backend.byTitle('Resiste')).to.not.eq(undefined));
      cy.contains('button.cancel', 'Cancelar').click();
      cy.contains('.title', 'Resiste').should('be.visible');
    });
  });

  it('si falla el progreso, el resumen ofrece Reintentar y las tareas siguen usables', () => {
    cy.boot({
      seed: (b) => {
        b.seed({ title: 'Sigue ahí' });
        b.fail('progress');
      },
    });
    cy.contains('.title', 'Sigue ahí').should('be.visible');
    cy.get('app-progress-summary [role="alert"]').should(
      'contain',
      'No pudimos cargar tu progreso'
    );
    cy.get('app-progress-summary button.retry').click();
    cy.get('app-progress-summary').should('contain', 'Nivel 1').and('contain', '0 / 50 XP');
  });

  it('la pantalla de progreso muestra el error con Reintentar y luego los datos', () => {
    cy.boot({
      path: '/progreso',
      seed: (b) => {
        b.seedCompleted('Cuenta', TODAY);
        b.fail('progress');
      },
    });
    cy.get('[role="alert"]').should('contain', 'No pudimos cargar tu progreso');
    cy.contains('button.retry', 'Reintentar').click();
    cy.contains('.stat', 'XP total').should('contain', '10');
  });

  it('un fallo al completar tras el cambio no cuela una celebración falsa', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Sin celebración', due_date: TODAY }) }).then(
      (backend) => {
        cy.get('app-progress-summary')
          .should('contain', '0 / 50 XP')
          .then(() => backend.fail('progress'));
        cy.get(done('Sin celebración')).click();
        cy.get('.notice').should('contain', 'Tarea completada');
        cy.get('app-celebration').should('not.exist');
        cy.location('pathname').should('eq', '/');
      }
    );
  });
});
