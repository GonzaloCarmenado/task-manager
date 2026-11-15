import { TODAY, addDay } from '../support/backend';

const done = (title: string) => `button.check[aria-label="Marcar como hecha: ${title}"]`;
const YESTERDAY = addDay(TODAY, -1);
const TWO_DAYS_AGO = addDay(TODAY, -2);

describe('Progreso y racha (extremo a extremo)', () => {
  it('usuario nuevo: pantalla de progreso con nivel 1, ceros y mensaje de bienvenida', () => {
    cy.boot();
    cy.get('app-progress-summary button.summary').click();
    cy.location('pathname').should('eq', '/progreso');
    cy.contains('h1', 'Tu progreso').should('be.visible');
    cy.contains('.level', 'Nivel 1').should('be.visible');
    cy.contains('.remaining', '0 / 50 XP').and('contain', 'Faltan 50 XP');
    cy.contains('.new-user', 'Completa tu primera tarea').should('be.visible');
    cy.contains('.stat', 'XP total').should('contain', '0');
    cy.contains('.stat', 'Racha actual').should('contain', 'Sin racha');
    cy.contains('.stat', 'XP de hoy').should('contain', '0 / 100');
    cy.contains('+10 XP por cada tarea completada').should('be.visible');
    cy.contains('tu nivel y tus XP siguen intactos').should('be.visible');
  });

  it('racha de tres días: completar hoy la alarga y la pantalla refleja total, hoy y mejor racha', () => {
    cy.boot({
      seed: (b) => {
        b.seedCompleted('Anteayer', TWO_DAYS_AGO);
        b.seedCompleted('Ayer', YESTERDAY);
        b.seed({ title: 'Hoy toca', due_date: TODAY });
      },
    });
    cy.get('app-progress-summary').should('contain', '2 días seguidos');
    cy.get('app-progress-summary .hint').should('contain', 'Completa 1 tarea hoy para mantenerla');

    cy.get(done('Hoy toca')).click();
    cy.get('app-celebration .celebration')
      .should('contain', '+10 XP')
      .and('contain', 'Llevas 3 días');
    cy.get('app-progress-summary').should('contain', '3 días seguidos');
    cy.get('app-progress-summary .hint').should('not.exist');

    cy.get('app-progress-summary button.summary').click();
    cy.contains('.stat', 'XP total').should('contain', '30');
    cy.contains('.stat', 'XP de hoy').should('contain', '10 / 100');
    cy.contains('.stat', 'Racha actual').should('contain', '3 días seguidos');
    cy.contains('.stat', 'Mejor racha').should('contain', '3 días seguidos');
  });

  it('si hoy aún no hay tareas, la racha de ayer sigue viva (sin culpa)', () => {
    cy.boot({ seed: (b) => b.seedCompleted('Ayer', YESTERDAY) });
    cy.get('app-progress-summary').should('contain', '1 día seguido');
    cy.get('app-progress-summary .hint').should('be.visible');
  });

  it('una racha rota no baja el nivel ni los XP; la mejor racha se conserva', () => {
    cy.boot({
      seed: (b) => {
        b.seedCompleted('Hace cuatro días', addDay(TODAY, -4));
        b.seedCompleted('Hace cinco días', addDay(TODAY, -5));
        b.seedCompleted('Hace seis días', addDay(TODAY, -6));
      },
    });
    cy.get('app-progress-summary').should('contain', 'Sin racha').and('contain', '30 / 50 XP');
    cy.get('app-progress-summary button.summary').click();
    cy.contains('.stat', 'Racha actual').should('contain', 'Sin racha');
    cy.contains('.stat', 'Mejor racha').should('contain', '3 días seguidos');
    cy.contains('.stat', 'XP total').should('contain', '30');
  });

  it('desmarcar la única tarea de hoy rompe la racha pero conserva la mejor', () => {
    cy.boot({
      seed: (b) => {
        b.seedCompleted('Anteayer', TWO_DAYS_AGO);
        b.seedCompleted('Ayer', YESTERDAY);
        b.seedCompleted('Hoy hecha', TODAY);
      },
    });
    cy.get('app-progress-summary').should('contain', '3 días seguidos');
    cy.contains('button.completed-toggle', 'Completadas').click();
    cy.get('button.check.checked[aria-label="Marcar como pendiente: Hoy hecha"]').click();
    cy.get('app-celebration .celebration').should('contain', '−10 XP');
    cy.get('app-progress-summary').should('contain', '2 días seguidos');
    cy.get('app-progress-summary button.summary').click();
    cy.contains('.stat', 'Mejor racha').should('contain', '3 días seguidos');
  });

  it('Volver y Cerrar regresan a la lista', () => {
    cy.boot({ path: '/progreso' });
    cy.contains('h1', 'Tu progreso').should('be.visible');
    cy.get('button.back').click();
    cy.location('pathname').should('eq', '/');
    cy.get('app-progress-summary button.summary').click();
    cy.get('button.close').click();
    cy.location('pathname').should('eq', '/');
  });

  it('abrir /progreso directamente carga los datos del servidor', () => {
    cy.boot({
      path: '/progreso',
      seed: (b) => {
        for (let i = 0; i < 6; i += 1) b.seedCompleted(`Hecha ${i}`, addDay(TODAY, -i - 10));
      },
    });
    cy.contains('.level', 'Nivel 2').should('be.visible');
    cy.contains('.stat', 'XP total').should('contain', '60');
  });
});
