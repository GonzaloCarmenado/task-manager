import { FakeBackend, SeriesRecord, TODAY, addDay } from '../support/backend';

const TOMORROW = addDay(TODAY, 1);

/** Serie diaria con su ocurrencia pendiente ya guardada en el servidor. */
function seedDaily(
  backend: FakeBackend,
  over: { title?: string; day?: string; seriesOver?: Partial<SeriesRecord> } = {}
) {
  const title = over.title ?? 'Pastilla';
  const day = over.day ?? TODAY;
  const series = backend.seedSeries({
    title,
    kind: 'daily',
    start_date: '2026-11-01',
    ...over.seriesOver,
  });
  const occurrence = backend.seed({
    title,
    due_date: day,
    series_id: series.id,
    series_date: day,
  });
  return { series, occurrence };
}

const row = () => cy.get('button.repeat');
const sheet = () => cy.get('app-recurrence-sheet');
const pickFrequency = (label: string) =>
  cy.contains('app-recurrence-sheet [role="radio"]', label).click();
const done = () => cy.get('app-recurrence-sheet .done').click();

describe('Tareas repetitivas: crear (US-012-01)', () => {
  it('crea una tarea «Todos los días» con hora: serie y primera ocurrencia en el servidor', () => {
    cy.boot({ path: '/nueva' }).then((backend) => {
      cy.get('#task-title').type('Tomar la pastilla');
      cy.get('input[type="time"]').should('not.be.disabled').type('08:00').trigger('change');
      row().should('contain', 'No se repite').click();
      pickFrequency('Todos los días');
      cy.get('app-recurrence-sheet').should('contain', 'Se repetirá todos los días');
      done();
      sheet().should('not.exist');
      row().should('contain', 'Todos los días');
      cy.contains('button.save', 'Guardar tarea').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('.group[data-kind="today"] .title', 'Tomar la pastilla').should('be.visible');
      cy.contains('.group[data-kind="today"] .repeat', 'Todos los días').should('be.visible');
      cy.wrap(null).should(() => {
        const series = backend.seriesOf('00000000-0000-4000-8000-000000000001')[0];
        expect(series.kind).to.eq('daily');
        expect(series.interval_n).to.eq(1);
        expect(series.start_date).to.eq(TODAY);
        expect(series.title).to.eq('Tomar la pastilla');
        expect(series.due_time).to.eq('08:00:00');
        const pending = backend.pendingOf(series.id);
        expect(pending).to.have.length(1);
        expect(pending[0].due_date).to.eq(TODAY);
        expect(pending[0].series_date).to.eq(TODAY);
      });
    });
  });

  it('«Días de la semana»: si la fecha no cae en un día marcado, la primera ocurrencia es el siguiente día válido', () => {
    cy.boot({ path: '/nueva' }).then((backend) => {
      cy.get('#task-title').type('Gimnasio');
      row().click();
      pickFrequency('Días de la semana');
      cy.get('app-recurrence-sheet .day[aria-label="sábado"]').click(); // el sábado viene marcado
      cy.get('app-recurrence-sheet .day[aria-label="lunes"]').click();
      cy.get('app-recurrence-sheet .day[aria-label="jueves"]').click();
      cy.get('app-recurrence-sheet').should('contain', 'Se repetirá los lunes y jueves');
      cy.get('app-recurrence-sheet').should('contain', 'Primera ocurrencia: lunes 16 de noviembre');
      done();
      cy.contains('button.save', 'Guardar tarea').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('.group .title', 'Gimnasio').should('be.visible');
      cy.contains('.group .repeat', 'Lun, jue').should('be.visible');
      cy.wrap(null).should(() => {
        const series = backend.seriesOf('00000000-0000-4000-8000-000000000001')[0];
        expect(series.kind).to.eq('weekly');
        expect(series.weekdays).to.deep.eq([1, 4]);
        expect(backend.pendingOf(series.id)[0].due_date).to.eq('2026-11-16');
      });
    });
  });

  it('sin días marcados no se puede aplicar y se explica por qué', () => {
    cy.boot({ path: '/nueva' });
    cy.get('#task-title').type('Algo');
    row().click();
    pickFrequency('Días de la semana');
    cy.get('app-recurrence-sheet .day[aria-label="sábado"]').click();
    cy.get('app-recurrence-sheet .done').should('be.disabled');
    cy.get('app-recurrence-sheet').should('contain', 'Elige al menos un día');
  });

  it('sin fecha la fila «Repetir» queda desactivada y explica por qué; con fecha otra vez se puede', () => {
    cy.boot({ path: '/nueva' });
    cy.contains('button.chip', 'Quitar fecha').click();
    row().should('be.disabled');
    cy.contains('Elige una fecha para repetir la tarea').should('be.visible');
    cy.contains('button.chip', 'Mañana').click();
    row().should('not.be.disabled');
  });

  it('quitar la fecha de una tarea con repetición la deja en «No se repite» y avisa', () => {
    cy.boot({ path: '/nueva' });
    row().click();
    pickFrequency('Todos los días');
    done();
    cy.contains('button.chip', 'Quitar fecha').click();
    row().should('contain', 'No se repite');
    cy.contains('Sin fecha la tarea ya no se repite.').should('be.visible');
  });

  it('el botón atrás de Android cierra la hoja sin salir del formulario', () => {
    cy.boot({ path: '/nueva' });
    row().click();
    sheet().should('exist');
    cy.go('back');
    sheet().should('not.exist');
    cy.location('pathname').should('eq', '/nueva');
  });

  it('descartar la hoja no cambia la repetición', () => {
    cy.boot({ path: '/nueva' });
    row().click();
    pickFrequency('Todos los días');
    cy.get('app-recurrence-sheet .discard').click();
    sheet().should('not.exist');
    row().should('contain', 'No se repite');
  });
});

describe('Tareas repetitivas: completar y la siguiente (US-012-02)', () => {
  it('completar la de hoy da XP, crea la de mañana y avisa de cuál es la próxima', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      cy.contains('.group[data-kind="today"] .title', 'Pastilla').should('be.visible');
      cy.get('.group[data-kind="today"] .check').click();

      cy.contains('Hecho. Próxima: domingo 15 de noviembre').should('be.visible');
      cy.contains('.group[data-kind="tomorrow"] .title', 'Pastilla').should('be.visible');
      cy.contains('.group[data-kind="tomorrow"] .available', 'Disponible mañana').should(
        'be.visible'
      );
      cy.get('.group[data-kind="tomorrow"] .check').should('be.disabled');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        const all = backend.occurrences(series.id);
        expect(all).to.have.length(2);
        expect(all.filter((t) => t.completed_at !== null)).to.have.length(1);
        expect(backend.pendingOf(series.id)[0].due_date).to.eq(TOMORROW);
        expect(backend.pendingOf(series.id)[0].title).to.eq('Pastilla');
        expect(backend.totalXp()).to.eq(10);
      });
    });
  });

  it('una ocurrencia de mañana no se puede completar y no se envía nada al servidor', () => {
    cy.boot({ seed: (backend) => seedDaily(backend, { day: TOMORROW }) }).then((backend) => {
      cy.get('.group[data-kind="tomorrow"] .check').should('be.disabled');
      cy.get('.group[data-kind="tomorrow"] .check').click({ force: true });
      cy.wrap(null).should(() => {
        expect(backend.count('PATCH', '/rest/v1/tasks')).to.eq(0);
        expect(backend.totalXp()).to.eq(0);
      });
    });
  });

  it('una ocurrencia de dentro de varios días dice el día en que estará disponible', () => {
    cy.boot({ seed: (backend) => seedDaily(backend, { day: '2026-11-19' }) });
    cy.contains('.available', 'Disponible el jueves').should('be.visible');
  });

  it('una ocurrencia atrasada se completa y la siguiente nace hoy, no en el pasado', () => {
    cy.boot({ seed: (backend) => seedDaily(backend, { day: '2026-11-10' }) }).then((backend) => {
      cy.get('.group[data-kind="overdue"]').should('contain', 'Atrasada');
      cy.get('.group[data-kind="overdue"] .check').click();

      cy.contains('.group[data-kind="today"] .title', 'Pastilla').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(backend.pendingOf(series.id)[0].due_date).to.eq(TODAY);
      });
    });
  });

  it('completar y desmarcar deja una sola ocurrencia pendiente', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      cy.get('.group[data-kind="today"] .check').click();
      cy.contains('.group[data-kind="tomorrow"] .title', 'Pastilla').should('be.visible');

      cy.contains('button.completed-toggle', 'Completadas').click();
      cy.get('.completed .check.checked').click();

      cy.contains('.group[data-kind="today"] .title', 'Pastilla').should('be.visible');
      cy.get('.group[data-kind="tomorrow"]').should('not.exist');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(backend.pendingOf(series.id)).to.have.length(1);
        expect(backend.pendingOf(series.id)[0].due_date).to.eq(TODAY);
      });
    });
  });

  it('si falla crear la siguiente, lo completado se conserva y al volver a cargar se repara', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      backend.fail('create', 1);
      cy.get('.group[data-kind="today"] .check').click();
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(
          backend.occurrences(series.id).filter((t) => t.completed_at !== null)
        ).to.have.length(1);
        expect(backend.pendingOf(series.id)).to.have.length(0);
      });

      cy.reload();
      cy.contains('.group[data-kind="tomorrow"] .title', 'Pastilla').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(backend.pendingOf(series.id)).to.have.length(1);
      });
    });
  });

  it('completar una tarea suelta sigue siendo como siempre', () => {
    cy.boot({ seed: (backend) => backend.seed({ title: 'Suelta', due_date: TODAY }) });
    cy.get('.group[data-kind="today"] .check').click();
    cy.contains('Tarea completada').should('be.visible');
    cy.get('.repeat').should('not.exist');
  });
});

describe('Tareas repetitivas: editar y borrar (US-012-03)', () => {
  const open = () => cy.contains('.task .title', 'Pastilla').click();
  const rename = (title: string) => cy.get('#task-title').clear().type(title);
  const save = () => cy.contains('button.save', 'Guardar tarea').click();

  it('editar «solo esta» cambia esa ocurrencia y no la serie', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      open();
      row().should('contain', 'Todos los días');
      rename('Pastilla de hoy');
      save();
      cy.get('app-series-choice-sheet .sheet')
        .should('be.visible')
        .and('contain', 'Esta tarea se repite');
      cy.contains('app-series-choice-sheet .single', 'Solo esta').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('.task .title', 'Pastilla de hoy').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(series.title).to.eq('Pastilla');
        expect(backend.pendingOf(series.id)[0].title).to.eq('Pastilla de hoy');
      });
    });
  });

  it('editar «toda la serie» cambia el título y la hora de la serie', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      open();
      rename('Vitaminas');
      cy.get('input[type="time"]').type('07:30').trigger('change');
      save();
      cy.contains('app-series-choice-sheet .all', 'Toda la serie').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('.task .title', 'Vitaminas').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(series.title).to.eq('Vitaminas');
        expect(series.due_time).to.eq('07:30:00');
        expect(backend.pendingOf(series.id)[0].title).to.eq('Vitaminas');
      });
    });
  });

  it('cancelar la hoja no guarda nada', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      open();
      rename('Otra cosa');
      save();
      cy.contains('app-series-choice-sheet .cancel', 'Cancelar').click();
      cy.get('app-series-choice-sheet').should('not.exist');
      cy.location('pathname').should('not.eq', '/');
      cy.wrap(null).should(() => expect(backend.count('PATCH', '/rest/v1/tasks')).to.eq(0));
    });
  });

  it('cambiar la regla a «No se repite» quita la repetición de toda la serie sin preguntar', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      open();
      row().click();
      pickFrequency('No se repite');
      done();
      save();

      cy.location('pathname').should('eq', '/');
      cy.get('.repeat').should('not.exist');
      cy.wrap(null).should(() => {
        expect(backend.seriesOf('00000000-0000-4000-8000-000000000001')).to.have.length(0);
        expect(backend.byTitle('Pastilla')?.series_id).to.eq(null);
      });
    });
  });

  it('una tarea suelta se puede convertir en repetitiva al editarla', () => {
    cy.boot({ seed: (backend) => backend.seed({ title: 'Pastilla', due_date: TODAY }) }).then(
      (backend) => {
        open();
        row().click();
        pickFrequency('Todos los días');
        done();
        save();

        cy.location('pathname').should('eq', '/');
        cy.contains('.group .repeat', 'Todos los días').should('be.visible');
        cy.wrap(null).should(() => {
          const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
          expect(series.kind).to.eq('daily');
          expect(backend.byTitle('Pastilla')?.series_id).to.eq(series.id);
        });
      }
    );
  });

  it('borrar «solo esta» elimina la ocurrencia y aparece la siguiente', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      open();
      cy.contains('button', 'Borrar tarea').click();
      cy.get('app-series-choice-sheet .sheet')
        .should('be.visible')
        .and('contain', 'Las ocurrencias ya completadas se conservan');
      cy.contains('app-series-choice-sheet .single', 'Solo esta').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('.group[data-kind="tomorrow"] .title', 'Pastilla').should('be.visible');
      cy.get('.group[data-kind="today"]').should('not.exist');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(backend.pendingOf(series.id)).to.have.length(1);
        expect(backend.pendingOf(series.id)[0].due_date).to.eq(TOMORROW);
      });
    });
  });

  it('borrar «toda la serie» borra la serie y la pendiente, y conserva lo ya completado', () => {
    cy.boot({
      seed: (backend) => {
        const { series } = seedDaily(backend);
        const done = backend.seedCompleted('Pastilla', '2026-11-12');
        done.series_id = series.id;
        done.series_date = '2026-11-12';
      },
    }).then((backend) => {
      open();
      cy.contains('button', 'Borrar tarea').click();
      cy.contains('app-series-choice-sheet .all', 'Toda la serie').click();

      cy.location('pathname').should('eq', '/');
      cy.contains('h2', 'Todo despejado por aquí').should('be.visible');
      cy.wrap(null).should(() => {
        expect(backend.seriesOf('00000000-0000-4000-8000-000000000001')).to.have.length(0);
        const remaining = backend.tasksOf('00000000-0000-4000-8000-000000000001');
        expect(remaining).to.have.length(1);
        expect(remaining[0].completed_at).not.to.eq(null);
        expect(remaining[0].series_id).to.eq(null);
      });
    });
  });

  it('«Volver atrás» al borrar no borra nada', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      open();
      cy.contains('button', 'Borrar tarea').click();
      cy.contains('app-series-choice-sheet .cancel', 'Volver atrás').click();
      cy.get('app-series-choice-sheet').should('not.exist');
      cy.wrap(null).should(() => expect(backend.count('DELETE', '/rest/v1/tasks')).to.eq(0));
    });
  });

  it('una tarea suelta se borra con la confirmación de siempre', () => {
    cy.boot({ seed: (backend) => backend.seed({ title: 'Pastilla', due_date: TODAY }) });
    open();
    cy.contains('button', 'Borrar tarea').click();
    cy.get('app-series-choice-sheet').should('not.exist');
    cy.contains('¿Borrar esta tarea?').should('be.visible');
  });

  it('posponer una ocurrencia mueve solo esa y su regla sigue igual', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) }).then((backend) => {
      cy.get('.group[data-kind="today"] .postpone').click();
      cy.contains('app-postpone-sheet button', 'Mañana').click();

      cy.contains('.group[data-kind="tomorrow"] .title', 'Pastilla').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        const pending = backend.pendingOf(series.id)[0];
        expect(pending.due_date).to.eq(TOMORROW);
        expect(pending.series_date).to.eq(TODAY);
        expect(series.kind).to.eq('daily');
      });
    });
  });
});

describe('Tareas repetitivas: intervalos, día del mes y fin (US-012-04, 05, 06)', () => {
  it('«Cada N días» con fecha de fin: se guarda la regla y la lista la describe', () => {
    cy.boot({ path: '/nueva' }).then((backend) => {
      cy.get('#task-title').type('Regar plantas');
      row().click();
      pickFrequency('Cada N días');
      cy.get('app-recurrence-sheet .stepper .value').should('have.text', '2');
      cy.get('app-recurrence-sheet .stepper .plus').click();
      cy.get('app-recurrence-sheet .stepper .value').should('have.text', '3');
      cy.contains('app-recurrence-sheet .end', 'El día').click();
      cy.get('app-recurrence-sheet input.end-date').type('2026-12-30').trigger('change');
      cy.get('app-recurrence-sheet').should('contain', 'hasta el 30 de diciembre');
      done();
      row().should('contain', 'Cada 3 días · hasta 30 dic');
      cy.contains('button.save', 'Guardar tarea').click();

      cy.contains('.group .repeat', 'Cada 3 días · hasta 30 dic').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(series.kind).to.eq('daily');
        expect(series.interval_n).to.eq(3);
        expect(series.until_date).to.eq('2026-12-30');
      });
    });
  });

  it('una fecha de fin anterior a la primera ocurrencia no se puede aplicar', () => {
    cy.boot({ path: '/nueva' });
    cy.get('#task-title').type('Algo');
    row().click();
    pickFrequency('Todos los días');
    cy.contains('app-recurrence-sheet .end', 'El día').click();
    cy.get('app-recurrence-sheet input.end-date').type('2026-11-10').trigger('change');
    cy.get('app-recurrence-sheet').should(
      'contain',
      'La fecha de fin no puede ser anterior a la primera ocurrencia'
    );
    cy.get('app-recurrence-sheet .done').should('be.disabled');
  });

  it('«Cada N semanas» pide los días y los guarda con el intervalo', () => {
    cy.boot({ path: '/nueva' }).then((backend) => {
      cy.get('#task-title').type('Informe');
      row().click();
      pickFrequency('Cada N semanas');
      cy.get('app-recurrence-sheet .day').should('have.length', 7);
      cy.get('app-recurrence-sheet .day[aria-label="sábado"]').click();
      cy.get('app-recurrence-sheet .day[aria-label="viernes"]').click();
      done();
      row().should('contain', 'Cada 2 semanas: vie');
      cy.contains('button.save', 'Guardar tarea').click();

      cy.contains('.group .repeat', 'Cada 2 semanas: vie').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(series.kind).to.eq('weekly');
        expect(series.interval_n).to.eq(2);
        expect(series.weekdays).to.deep.eq([5]);
        expect(backend.pendingOf(series.id)[0].due_date).to.eq('2026-11-27');
      });
    });
  });

  it('«Un día del mes» avisa de los meses cortos y se guarda con su día', () => {
    cy.boot({ path: '/nueva' }).then((backend) => {
      cy.get('#task-title').type('Pagar alquiler');
      row().click();
      pickFrequency('Un día del mes');
      cy.get('app-recurrence-sheet .stepper .value').should('have.text', '14');
      for (let i = 0; i < 17; i += 1) cy.get('app-recurrence-sheet .stepper .plus').click();
      cy.get('app-recurrence-sheet .stepper .value').should('have.text', '31');
      cy.get('app-recurrence-sheet .sheet')
        .should('be.visible')
        .and('contain', 'será el último día del mes');
      done();
      row().should('contain', 'El día 31 de cada mes');
      cy.contains('button.save', 'Guardar tarea').click();

      cy.contains('.group .repeat', 'El día 31 de cada mes').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(series.kind).to.eq('monthly');
        expect(series.month_day).to.eq(31);
        expect(backend.pendingOf(series.id)[0].due_date).to.eq('2026-11-30');
      });
    });
  });

  it('completar la última repetición avisa y no crea otra', () => {
    cy.boot({
      seed: (backend) => seedDaily(backend, { seriesOver: { until_date: TODAY } }),
    }).then((backend) => {
      cy.get('.group[data-kind="today"] .check').click();
      cy.contains('Hecho. Era la última repetición').should('be.visible');
      cy.wrap(null).should(() => {
        const [series] = backend.seriesOf('00000000-0000-4000-8000-000000000001');
        expect(backend.pendingOf(series.id)).to.have.length(0);
      });
    });
  });
});
