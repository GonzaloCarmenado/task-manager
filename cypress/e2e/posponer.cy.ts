import { TODAY } from '../support/backend';

const postponeButton = (title: string) => `button.postpone[aria-label="Posponer: ${title}"]`;

describe('Posponer tareas (extremo a extremo)', () => {
  it('la hoja ofrece Mañana y La semana que viene (y Más tarde hoy solo si tiene hora)', () => {
    cy.boot({
      seed: (b) => {
        b.seed({ title: 'Con hora', due_date: TODAY, due_time: '09:00:00' });
        b.seed({ title: 'Sin hora', due_date: TODAY });
      },
    });
    cy.get(postponeButton('Sin hora')).click();
    cy.get('[role="dialog"]').should('contain', 'Posponer tarea').and('contain', 'Sin hora');
    cy.get('.option .label').then(($l) => {
      expect([...$l].map((e) => e.textContent?.trim())).to.deep.eq([
        'Mañana',
        'La semana que viene',
      ]);
    });
    cy.contains('button', 'Cerrar').click();
    cy.get('[role="dialog"]').should('not.exist');

    cy.get(postponeButton('Con hora')).click();
    cy.get('.option .label').then(($l) => {
      expect([...$l].map((e) => e.textContent?.trim())).to.deep.eq([
        'Más tarde hoy',
        'Mañana',
        'La semana que viene',
      ]);
    });
  });

  it('Mañana: la tarea pasa al grupo de mañana, cuenta como pospuesta y se guarda', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Informe', due_date: TODAY }) }).then((backend) => {
      cy.get(postponeButton('Informe')).click();
      cy.contains('.option', 'Mañana').click();

      cy.get('[role="dialog"]').should('not.exist');
      cy.contains('.group[data-kind="tomorrow"] .title', 'Informe').should('be.visible');
      cy.get('.group[data-kind="today"]').should('not.exist');
      cy.get('.notice').should('be.visible');
      cy.wrap(null).should(() => {
        const saved = backend.byTitle('Informe');
        expect(saved?.due_date).to.eq('2026-11-15');
        expect(saved?.postponed_count).to.eq(1);
      });
    });
  });

  it('La semana que viene: lleva la tarea al lunes siguiente', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Revisión', due_date: TODAY }) }).then((backend) => {
      cy.get(postponeButton('Revisión')).click();
      cy.contains('.option', 'La semana que viene').click();
      cy.contains('.group[data-kind="date"] .group-title', 'Lunes, 16 de noviembre').should(
        'be.visible'
      );
      cy.wrap(null).should(() => expect(backend.byTitle('Revisión')?.due_date).to.eq('2026-11-16'));
    });
  });

  it('Más tarde hoy: una hora después, misma fecha, y mantiene la hora en la lista', () => {
    cy.boot({
      seed: (b) => b.seed({ title: 'Llamada', due_date: TODAY, due_time: '09:00:00' }),
    }).then((backend) => {
      cy.get(postponeButton('Llamada')).click();
      cy.contains('.option', 'Más tarde hoy').should('contain', '11:00').click();
      cy.contains('.group[data-kind="today"] .when', '11:00').should('be.visible');
      cy.wrap(null).should(() => {
        const saved = backend.byTitle('Llamada');
        expect(saved?.due_date).to.eq(TODAY);
        expect(saved?.due_time).to.eq('11:00:00');
      });
    });
  });

  it('una tarea atrasada se pospone y deja de estar en Atrasadas', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Olvidada', due_date: '2026-11-09' }) }).then(
      (backend) => {
        cy.get('.group[data-kind="overdue"] .tag').should('contain', 'Atrasada');
        cy.get(postponeButton('Olvidada')).click();
        cy.contains('.option', 'Mañana').click();
        cy.get('.group[data-kind="overdue"]').should('not.exist');
        cy.contains('.group[data-kind="tomorrow"] .title', 'Olvidada').should('be.visible');
        cy.wrap(null).should(() => expect(backend.byTitle('Olvidada')?.postponed_count).to.eq(1));
      }
    );
  });

  it('elegir fecha: acepta un día posterior y rechaza uno que no lo es', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Viaje', due_date: '2026-11-15' }) }).then((backend) => {
      cy.get(postponeButton('Viaje')).click();
      cy.get('#postpone-date').should('have.attr', 'min', '2026-11-16');

      cy.get('#postpone-date').type('2026-11-15').trigger('change');
      cy.contains('[role="alert"]', 'Elige un día posterior al actual de la tarea.').should(
        'be.visible'
      );
      cy.get('[role="dialog"]').should('exist');
      cy.wrap(null).should(() => expect(backend.count('PATCH', '/rest/v1/tasks')).to.eq(0));

      cy.get('#postpone-date').clear().type('2026-11-25').trigger('change');
      cy.get('[role="dialog"]').should('not.exist');
      cy.contains('.group[data-kind="date"] .group-title', 'Miércoles, 25 de noviembre').should(
        'be.visible'
      );
      cy.wrap(null).should(() => {
        expect(backend.byTitle('Viaje')?.due_date).to.eq('2026-11-25');
        expect(backend.byTitle('Viaje')?.postponed_count).to.eq(1);
      });
    });
  });

  it('desde el formulario de edición también se pospone y se vuelve a la lista', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Desde el formulario', due_date: TODAY }) }).then(
      (backend) => {
        cy.contains('.task .open', 'Desde el formulario').click();
        cy.contains('button.postpone', 'Posponer').click();
        cy.get('[role="dialog"]').should('contain', 'Posponer tarea');
        cy.contains('.option', 'Mañana').click();

        cy.location('pathname').should('eq', '/');
        cy.contains('.group[data-kind="tomorrow"] .title', 'Desde el formulario').should(
          'be.visible'
        );
        cy.wrap(null).should(() =>
          expect(backend.byTitle('Desde el formulario')?.postponed_count).to.eq(1)
        );
      }
    );
  });

  it('si el servidor falla, la tarea vuelve a su sitio y se avisa', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Fallo', due_date: TODAY }) }).then((backend) => {
      backend.fail('update');
      cy.get(postponeButton('Fallo')).click();
      cy.contains('.option', 'Mañana').click();

      cy.get('.notice.error').should('contain', 'No se pudo posponer la tarea');
      cy.contains('.group[data-kind="today"] .title', 'Fallo').should('be.visible');
      cy.wrap(null).should(() => {
        expect(backend.byTitle('Fallo')?.due_date).to.eq(TODAY);
        expect(backend.byTitle('Fallo')?.postponed_count).to.eq(0);
      });
    });
  });

  it('una tarea completada no se puede posponer (no tiene botón)', () => {
    cy.boot({ seed: (b) => b.seedCompleted('Ya hecha', TODAY) });
    cy.contains('button.completed-toggle', 'Completadas').click();
    cy.contains('.task.done', 'Ya hecha').find('button.postpone').should('not.exist');
  });
});
