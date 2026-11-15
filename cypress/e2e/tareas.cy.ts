import { TODAY } from '../support/backend';

describe('Tareas: crear, editar y borrar (extremo a extremo)', () => {
  it('abre con sesión anónima y muestra el estado vacío con su acción', () => {
    cy.boot().then((backend) => {
      cy.contains('h2', 'Todo despejado por aquí').should('be.visible');
      cy.contains('button', 'Crear primera tarea').should('be.visible');
      cy.wrap(null).should(() => expect(backend.signups).to.eq(1));
    });
  });

  it('crea una tarea para hoy con hora, la ve en su grupo y queda guardada en el servidor', () => {
    cy.boot().then((backend) => {
      cy.contains('button', 'Crear primera tarea').click();
      cy.location('pathname').should('eq', '/nueva');

      cy.get('#task-title').type('Comprar pan');
      cy.contains('button.chip', 'Hoy').click().should('have.attr', 'aria-pressed', 'true');
      cy.get('input[type="time"]').should('not.be.disabled').type('18:30').trigger('change');
      cy.contains('button.save', 'Guardar tarea').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('.group[data-kind="today"] .title', 'Comprar pan').should('be.visible');
      cy.contains('.group[data-kind="today"] .when', '18:30').should('be.visible');
      cy.wrap(null).should(() => {
        const saved = backend.byTitle('Comprar pan');
        expect(saved?.due_date).to.eq(TODAY);
        expect(saved?.due_time).to.eq('18:30:00');
        expect(saved?.completed_at).to.eq(null);
      });
    });
  });

  it('no deja guardar sin título y avisa; con título ya deja', () => {
    cy.boot();
    cy.contains('button', 'Crear primera tarea').click();
    cy.get('button.save').should('be.disabled');
    cy.contains('Escribe un título para poder guardar').should('be.visible');
    cy.get('#task-title').type('   ');
    cy.get('button.save').should('be.disabled');
    cy.get('#task-title').clear().type('Algo');
    cy.get('button.save').should('not.be.disabled');
    cy.contains('Escribe un título para poder guardar').should('not.exist');
  });

  it('cuenta los caracteres y bloquea un título de más de 120', () => {
    cy.boot();
    cy.contains('button', 'Crear primera tarea').click();
    cy.get('#task-title').type('a'.repeat(121), { delay: 0 });
    cy.get('.counter').should('contain', '121 / 120').and('have.class', 'over');
    cy.get('button.save').should('be.disabled');
    cy.get('#task-title').type('{backspace}');
    cy.get('.counter').should('contain', '120 / 120');
    cy.get('button.save').should('not.be.disabled');
  });

  it('una tarea nueva nace con fecha de hoy; sin fecha la hora se desactiva y se borra', () => {
    cy.boot({ path: '/nueva' });
    cy.contains('button.chip', 'Hoy').should('have.attr', 'aria-pressed', 'true');
    cy.get('input[type="time"]').should('not.be.disabled').type('07:45').trigger('change');
    cy.contains('button.chip', 'Quitar hora').should('be.visible');

    cy.contains('button.chip', 'Quitar fecha').click();
    cy.get('input[type="time"]').should('be.disabled').and('have.value', '');
    cy.contains('Elige una fecha para poder poner una hora.').should('be.visible');

    cy.contains('button.chip', 'Mañana').click();
    cy.get('input[type="time"]').should('not.be.disabled').and('have.value', '');
  });

  it('guardar sin fecha deja la tarea en "Sin fecha" y sin hora en el servidor', () => {
    cy.boot({ path: '/nueva' }).then((backend) => {
      cy.get('#task-title').type('Algún día');
      cy.contains('button.chip', 'Quitar fecha').click();
      cy.get('button.save').click();
      cy.contains('.group[data-kind="none"] .title', 'Algún día').should('be.visible');
      cy.wrap(null).should(() => {
        expect(backend.byTitle('Algún día')?.due_date).to.eq(null);
        expect(backend.byTitle('Algún día')?.due_time).to.eq(null);
      });
    });
  });

  it('agrupa por Atrasadas, Hoy, Mañana, fecha futura y Sin fecha, en orden', () => {
    cy.boot({
      seed: (b) => {
        b.seed({ title: 'Sin fecha' });
        b.seed({ title: 'Vieja', due_date: '2026-11-10' });
        b.seed({ title: 'Para hoy tarde', due_date: TODAY, due_time: '20:00:00' });
        b.seed({ title: 'Para hoy pronto', due_date: TODAY, due_time: '08:00:00' });
        b.seed({ title: 'Para mañana', due_date: '2026-11-15' });
        b.seed({ title: 'Para el 20', due_date: '2026-11-20' });
      },
    });
    cy.get('.group:not(.completed) .group-title').then(($titles) => {
      const labels = [...$titles].map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
      expect(labels).to.deep.eq([
        'Atrasadas 1',
        'Hoy 2',
        'Mañana 1',
        'Viernes, 20 de noviembre 1',
        'Sin fecha 1',
      ]);
    });
    cy.get('.group[data-kind="today"] .title').then(($t) => {
      expect([...$t].map((e) => e.textContent?.trim())).to.deep.eq([
        'Para hoy pronto',
        'Para hoy tarde',
      ]);
    });
    cy.get('.group[data-kind="overdue"] .tag').should('contain', 'Atrasada');
  });

  it('edita título, fecha y hora; el cambio llega al servidor y se ve en la lista', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Llamar al dentista', due_date: TODAY }) }).then(
      (backend) => {
        cy.contains('.task .open', 'Llamar al dentista').click();
        cy.contains('h1', 'Editar tarea').should('be.visible');
        cy.get('#task-title')
          .should('have.value', 'Llamar al dentista')
          .clear()
          .type('Llamar al médico');
        cy.contains('button.chip', 'Mañana').click();
        cy.get('input[type="time"]').type('09:15').trigger('change');
        cy.contains('button.save', 'Guardar tarea').click();

        cy.location('pathname').should('eq', '/');
        cy.contains('.group[data-kind="tomorrow"] .title', 'Llamar al médico').should('be.visible');
        cy.contains('.title', 'Llamar al dentista').should('not.exist');
        cy.wrap(null).should(() => {
          const saved = backend.byTitle('Llamar al médico');
          expect(saved?.due_date).to.eq('2026-11-15');
          expect(saved?.due_time).to.eq('09:15:00');
        });
      }
    );
  });

  it('cancelar la edición no guarda nada', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Sin tocar' }) }).then((backend) => {
      cy.contains('.task .open', 'Sin tocar').click();
      cy.get('#task-title').clear().type('Cambiado');
      cy.contains('button.cancel', 'Cancelar').click();
      cy.location('pathname').should('eq', '/');
      cy.contains('.title', 'Sin tocar').should('be.visible');
      cy.wrap(null).should(() => expect(backend.count('PATCH', '/rest/v1/tasks')).to.eq(0));
    });
  });

  it('borrar pide confirmación: "No, conservar" la mantiene y "Sí, borrar" la elimina del servidor', () => {
    cy.boot({
      seed: (b) => {
        b.seed({ title: 'Borrame' });
        b.seed({ title: 'Quedate' });
      },
    }).then((backend) => {
      cy.contains('.task .open', 'Borrame').click();
      cy.contains('button.delete', 'Borrar tarea').click();
      cy.get('[role="alertdialog"]')
        .should('contain', '¿Borrar esta tarea?')
        .and('contain', 'no se puede deshacer');
      cy.contains('button.keep', 'No, conservar').click();
      cy.get('[role="alertdialog"]').should('not.exist');
      cy.wrap(null).should(() => expect(backend.tasks).to.have.length(2));

      cy.contains('button.delete', 'Borrar tarea').click();
      cy.contains('button.confirm', 'Sí, borrar').click();
      cy.location('pathname').should('eq', '/');
      cy.contains('.title', 'Borrame').should('not.exist');
      cy.contains('.title', 'Quedate').should('be.visible');
      cy.wrap(null).should(() => {
        expect(backend.tasks.map((t) => t.title)).to.deep.eq(['Quedate']);
      });
    });
  });

  it('la sesión y las tareas sobreviven a recargar: no se crea otra sesión', () => {
    cy.boot({ seed: (b) => b.seed({ title: 'Persistente' }) }).then((backend) => {
      cy.contains('.title', 'Persistente').should('be.visible');
      cy.reload();
      cy.contains('.title', 'Persistente').should('be.visible');
      cy.wrap(null).should(() => expect(backend.signups).to.eq(1));
    });
  });
});
