import { TODAY } from '../support/backend';

const done = (title: string) => `button.check[aria-label="Marcar como hecha: ${title}"]`;
const undone = (title: string) => `button.check[aria-label="Marcar como pendiente: ${title}"]`;

describe('Completar tareas, XP, tope diario y niveles (extremo a extremo)', () => {
  it('completar da +10 XP: celebra, mueve la tarea a Completadas y sube la barra', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Regar plantas', due_date: TODAY }) }).then(
      (backend) => {
        cy.get('app-progress-summary').should('contain', 'Nivel 1').and('contain', '0 / 50 XP');
        cy.get('app-progress-summary').should('contain', 'Sin racha');

        cy.get(done('Regar plantas')).click();

        cy.get('app-celebration .celebration')
          .should('contain', '+10 XP')
          .and('contain', 'Llevas 1 día');
        cy.get('.notice').should('contain', 'Tarea completada');
        cy.contains('.group[data-kind="today"] .title', 'Regar plantas').should('not.exist');
        cy.get('app-progress-summary')
          .should('contain', '10 / 50 XP')
          .and('contain', '1 día seguido');
        cy.get('app-progress-summary [role="progressbar"]').should(
          'have.attr',
          'aria-valuenow',
          '10'
        );

        cy.contains('button.completed-toggle', 'Completadas (1)').click();
        cy.get('.completed .title').should('contain', 'Regar plantas');
        cy.wrap(null).should(() => {
          const saved = backend.byTitle('Regar plantas');
          expect(saved?.completed_day).to.eq(TODAY); // día local, no UTC
          expect(saved?.xp_awarded).to.eq(10);
          expect(backend.totalXp()).to.eq(10);
        });
      }
    );
  });

  it('desmarcar quita los XP (−10 XP), devuelve la tarea a pendientes y baja la racha', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Hacer cama', due_date: TODAY }) }).then((backend) => {
      cy.get(done('Hacer cama')).click();
      cy.get('app-progress-summary').should('contain', '10 / 50 XP');
      cy.get('app-celebration', { timeout: 4000 }).should('not.exist');

      cy.contains('button.completed-toggle', 'Completadas (1)').click();
      cy.get(undone('Hacer cama')).click();

      cy.get('app-celebration .celebration').should('contain', '−10 XP');
      cy.get('.notice').should('contain', 'Tarea pendiente otra vez');
      cy.contains('.group[data-kind="today"] .title', 'Hacer cama').should('be.visible');
      cy.get('app-progress-summary').should('contain', '0 / 50 XP').and('contain', 'Sin racha');
      cy.wrap(null).should(() => {
        const saved = backend.byTitle('Hacer cama');
        expect(saved?.completed_at).to.eq(null);
        expect(saved?.completed_day).to.eq(null);
        expect(backend.totalXp()).to.eq(0);
      });
    });
  });

  it('completar y desmarcar en bucle no fabrica XP', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Bucle', due_date: TODAY }) }).then((backend) => {
      for (let i = 0; i < 3; i += 1) {
        cy.get(done('Bucle')).click();
        cy.get('app-progress-summary').should('contain', '10 / 50 XP');
        cy.contains('button.completed-toggle', 'Completadas (1)').then(($b) => {
          if ($b.attr('aria-expanded') !== 'true') cy.wrap($b).click();
        });
        cy.get(undone('Bucle')).click();
        cy.get('app-progress-summary').should('contain', '0 / 50 XP');
      }
      cy.wrap(null).should(() => expect(backend.totalXp()).to.eq(0));
    });
  });

  it('al llegar a 50 XP sube de nivel: pantalla de enhorabuena y Continuar vuelve a la lista', () => {
    cy.boot({
      seed: (b) => {
        for (let i = 1; i <= 5; i += 1) b.seed({ title: `Tarea ${i}`, due_date: TODAY });
      },
    });
    for (let i = 1; i <= 4; i += 1) {
      cy.get(done(`Tarea ${i}`)).click();
      cy.get('app-progress-summary').should('contain', `${i * 10} / 50 XP`);
    }
    cy.location('pathname').should('eq', '/');
    cy.get(done('Tarea 5')).click();

    cy.location('pathname').should('eq', '/nivel/2');
    cy.contains('h1', '¡Has subido de nivel!').should('be.visible');
    cy.get('.level').should('have.text', '2');
    cy.contains('Enhorabuena').should('be.visible');
    cy.contains('button.continue', 'Continuar').click();

    cy.location('pathname').should('eq', '/');
    cy.get('app-progress-summary').should('contain', 'Nivel 2').and('contain', '0 / 100 XP');
  });

  it('con 100 XP en el día se llega al tope: la tarea 11 se completa pero da 0 XP y avisa', () => {
    cy.boot({
      seed: (b) => {
        for (let i = 1; i <= 9; i += 1) b.seedCompleted(`Hecha ${i}`, TODAY);
        b.seed({ title: 'Décima', due_date: TODAY });
        b.seed({ title: 'Undécima', due_date: TODAY });
      },
    }).then((backend) => {
      cy.get('app-progress-summary').should('contain', 'Nivel 2').and('contain', '40 / 100 XP');
      cy.get(done('Décima')).click();
      cy.get('app-progress-summary').should('contain', '50 / 100 XP');
      cy.location('pathname').should('eq', '/');
      cy.get(done('Undécima')).click();

      cy.get('app-celebration .celebration').should('contain', 'Hoy ya has llegado al tope de XP');
      cy.get('app-progress-summary').should('contain', '50 / 100 XP');
      cy.contains('.title', 'Undécima').should('not.exist');
      cy.wrap(null).should(() => {
        expect(backend.byTitle('Undécima')?.completed_at).to.not.eq(null);
        expect(backend.byTitle('Undécima')?.xp_awarded).to.eq(0);
        expect(backend.totalXp()).to.eq(100);
      });
    });
  });

  it('desmarcar una tarea sin XP (pasado el tope) no resta nada', () => {
    cy.boot({
      seed: (b) => {
        for (let i = 1; i <= 10; i += 1) b.seedCompleted(`Hecha ${i}`, TODAY);
        b.seed({ title: 'Extra', due_date: TODAY });
      },
    }).then((backend) => {
      cy.get(done('Extra')).click();
      cy.get('app-celebration .celebration').should('contain', 'tope de XP');
      cy.contains('button.completed-toggle', 'Completadas').click();
      cy.get(undone('Extra')).click();
      cy.get('.notice').should('contain', 'Tarea pendiente otra vez');
      cy.get('app-celebration .celebration').should('not.exist');
      cy.wrap(null).should(() => expect(backend.totalXp()).to.eq(100));
    });
  });

  it('se envía el día local (AAAA-MM-DD) junto con la hora de completado', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Nocturna', due_date: TODAY }) }).then((backend) => {
      cy.get(done('Nocturna')).click();
      cy.wrap(null).should(() => {
        const body = backend.lastBody('PATCH', '/rest/v1/tasks');
        expect(body?.['completed_day']).to.eq(TODAY);
        expect(String(body?.['completed_at'])).to.match(/^2026-11-14T/);
      });
    });
  });
});
