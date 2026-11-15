// Fidelidad al diseño de Stitch (spec 012) a 390×844: medidas de la fila «Repetir», la hoja de repetición, la
// lista y las hojas de decisión; zonas táctiles de al menos 44 px y sin desbordes. Las capturas
// (`cypress/screenshots`, ignoradas por git) sirven para la revisión visual. Usa el backend simulado.
import { FakeBackend, TODAY } from '../support/backend';

const rect = (selector: string, index = 0) =>
  cy
    .get(selector)
    .eq(index)
    .then(($el) => $el[0].getBoundingClientRect());

/** Tamaño de un elemento una vez asentado el layout (reintenta). */
const size = (selector: string, w: number | null, h: number, index = 0) =>
  cy
    .get(selector)
    .eq(index)
    .should(($el) => {
      const r = $el[0].getBoundingClientRect();
      if (w !== null) expect(r.width, `${selector} ancho`).to.be.closeTo(w, 0.6);
      expect(r.height, `${selector} alto`).to.be.closeTo(h, 0.6);
    });

const atLeast = (selector: string, min: number, index = 0) =>
  cy
    .get(selector)
    .eq(index)
    .should(($el) => {
      const r = $el[0].getBoundingClientRect();
      expect(r.width, `${selector} ancho`).to.be.at.least(min - 0.6);
      expect(r.height, `${selector} alto`).to.be.at.least(min - 0.6);
    });

const noHorizontalOverflow = () =>
  cy.document().should((doc) => {
    expect(doc.documentElement.scrollWidth, 'desborde horizontal').to.be.at.most(
      doc.documentElement.clientWidth
    );
  });

function seedDaily(backend: FakeBackend, day = TODAY) {
  const series = backend.seedSeries({ title: 'Pastilla', start_date: '2026-11-01' });
  backend.seed({ title: 'Pastilla', due_date: day, series_id: series.id, series_date: day });
}

describe('Fidelidad de las tareas repetitivas (390×844)', () => {
  it('formulario: la fila «Repetir» es una zona táctil de al menos 44 px y no desborda', () => {
    cy.boot({ path: '/nueva' });
    cy.get('button.repeat').should('be.visible');
    atLeast('button.repeat', 44);
    size('.repeat-icon', 40, 40);
    noHorizontalOverflow();
    cy.screenshot('repetir-formulario', { capture: 'viewport' });
  });

  it('hoja de repetición: anclada abajo, controles de 44 y 52 px, y todo dentro de la pantalla', () => {
    cy.boot({ path: '/nueva' });
    cy.get('button.repeat').click();
    cy.get('app-recurrence-sheet .sheet').should('be.visible');
    cy.contains('app-recurrence-sheet [role="radio"]', 'Días de la semana').click();

    cy.get('app-recurrence-sheet .sheet').should(($el) => {
      const r = $el[0].getBoundingClientRect();
      const doc = $el[0].ownerDocument;
      expect(r.bottom, 'hoja pegada abajo').to.be.closeTo(doc.documentElement.clientHeight, 1);
      expect(r.width, 'hoja a todo el ancho').to.be.closeTo(doc.documentElement.clientWidth, 1);
      expect(r.left, 'hoja sin desbordar').to.be.at.least(0);
    });
    size('app-recurrence-sheet .close', 44, 44);
    size('app-recurrence-sheet .pill', null, 36);
    for (let i = 0; i < 7; i += 1) size('app-recurrence-sheet .day', 44, 44, i);
    size('app-recurrence-sheet .done', null, 52);
    size('app-recurrence-sheet .discard', null, 52);
    cy.get('app-recurrence-sheet .sheet').should('have.css', 'border-top-left-radius', '24px');
    noHorizontalOverflow();
    cy.screenshot('repetir-hoja-semana', { capture: 'viewport' });
  });

  it('hoja de repetición: los selectores − y + son de 44 px y la fecha de fin cabe', () => {
    cy.boot({ path: '/nueva' });
    cy.get('button.repeat').click();
    cy.contains('app-recurrence-sheet [role="radio"]', 'Cada N días').click();
    size('app-recurrence-sheet .step.minus', 44, 44);
    size('app-recurrence-sheet .step.plus', 44, 44);
    cy.contains('app-recurrence-sheet .end', 'El día').click();
    atLeast('app-recurrence-sheet input.end-date', 44);
    cy.get('app-recurrence-sheet .sheet').should('be.visible');
    cy.screenshot('repetir-hoja-cada-n-fin', { capture: 'viewport' });
    noHorizontalOverflow();
  });

  it('hoja de repetición: «Un día del mes» con el aviso de meses cortos', () => {
    cy.boot({ path: '/nueva' });
    cy.get('button.repeat').click();
    cy.contains('app-recurrence-sheet [role="radio"]', 'Un día del mes').click();
    for (let i = 0; i < 17; i += 1) cy.get('app-recurrence-sheet .stepper .plus').click();
    cy.get('app-recurrence-sheet .hint').should('be.visible');
    noHorizontalOverflow();
    cy.screenshot('repetir-hoja-mes', { capture: 'viewport' });
  });

  it('lista: el indicador de repetición no desborda y el check de una futura es de 44 px', () => {
    cy.boot({
      seed: (backend) => {
        seedDaily(backend);
        const weekly = backend.seedSeries({
          title: 'Gimnasio con un título bastante largo para comprobar que no desborda la tarjeta',
          kind: 'weekly',
          weekdays: [1, 4],
          start_date: '2026-11-09',
          due_time: '19:00:00',
        });
        backend.seed({
          title: weekly.title,
          due_date: '2026-11-19',
          due_time: '19:00:00',
          series_id: weekly.id,
          series_date: '2026-11-19',
        });
      },
    });
    cy.get('.repeat').should('have.length', 2);
    cy.get('.repeat')
      .first()
      .should(($el) => expect($el[0].getBoundingClientRect().height).to.be.closeTo(24, 0.6));
    cy.get('.available').should('be.visible').and('contain', 'Disponible el jueves');
    cy.get('.check:disabled').should('have.length', 1);
    atLeast('.check:disabled', 44);
    atLeast('.check:not(:disabled)', 44);
    noHorizontalOverflow();
    cy.screenshot('repetir-lista', { capture: 'viewport' });
  });

  it('hojas «Esta tarea se repite»: opciones de al menos 56 px y salida de 52 px', () => {
    cy.boot({ seed: (backend) => seedDaily(backend) });
    cy.contains('.task .title', 'Pastilla').click();
    cy.get('#task-title').clear().type('Otra pastilla');
    cy.contains('button.save', 'Guardar tarea').click();

    cy.get('app-series-choice-sheet .sheet').should('be.visible');
    for (let i = 0; i < 2; i += 1) {
      cy.get('app-series-choice-sheet .option')
        .eq(i)
        .should(($el) => expect($el[0].getBoundingClientRect().height).to.be.at.least(55.4));
    }
    size('app-series-choice-sheet .cancel', null, 52);
    noHorizontalOverflow();
    cy.screenshot('repetir-hoja-editar', { capture: 'viewport' });

    cy.get('app-series-choice-sheet .cancel').click();
    cy.contains('button', 'Borrar tarea').click();
    cy.get('app-series-choice-sheet .sheet').should('be.visible').and('contain', 'Volver atrás');
    cy.get('app-series-choice-sheet .all').should('have.class', 'danger');
    noHorizontalOverflow();
    cy.screenshot('repetir-hoja-borrar', { capture: 'viewport' });
  });

  it('la fuente es local y no se pide nada a servicios externos', () => {
    cy.boot({ path: '/nueva' });
    cy.get('button.repeat').click();
    cy.get('app-recurrence-sheet .title')
      .should('have.css', 'font-family')
      .and('contain', 'Plus Jakarta Sans');
    cy.window().then((win) => {
      // Solo estilos, scripts, fuentes e imágenes: las peticiones a Supabase (simuladas) no cuentan.
      const assets = ['link', 'script', 'css', 'img', 'font'];
      const external = (win.performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((e) => assets.includes(e.initiatorType))
        .map((e) => e.name)
        .filter((n) => !n.startsWith(win.location.origin) && !n.startsWith('data:'));
      expect(external).to.deep.eq([]);
    });
  });
});

// Evita avisos por la variable sin usar en entornos donde `rect` no se emplea.
void rect;
