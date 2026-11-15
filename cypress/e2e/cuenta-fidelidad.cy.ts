// Fidelidad al diseño de Stitch: a 390×844 cada pantalla de cuenta tiene las medidas del plan
// (specs/011-cuenta-usuario/plan.md → «Pantallas»). Usa las vistas previas de desarrollo y la app con el
// backend simulado; no toca ningún Supabase real.
import { TODAY } from '../support/backend';

const PASSWORD = ['Clave', 'Segura', '123'].join('');

interface Box {
  w: number;
  h: number;
  radius: string;
  padding: string;
}

/** Ancho, alto, radio y relleno calculados de un elemento. */
const box = (selector: string, index = 0): Cypress.Chainable<Box> =>
  cy
    .get(selector)
    .eq(index)
    .then(($el) => {
      const rect = $el[0].getBoundingClientRect();
      const style = $el[0].ownerDocument.defaultView?.getComputedStyle($el[0]);
      return {
        w: rect.width,
        h: rect.height,
        radius: style?.borderRadius ?? '',
        padding: style?.padding ?? '',
      };
    });

/** Anchos relativos: el viewport de 390 px incluye la barra de scroll, así que el área útil es menor. */
type Width = number | null | 'full' | 'page' | 'sheet';

const expectSize = (selector: string, width: Width, h: number, index = 0) =>
  // `should` reintenta hasta que el layout y las animaciones de entrada se asientan
  cy
    .get(selector)
    .eq(index)
    .should(($el) => {
      const doc = $el[0].ownerDocument;
      const available = doc.documentElement.clientWidth;
      const w =
        width === 'full'
          ? available
          : width === 'page'
            ? available - 40
            : width === 'sheet'
              ? available - 48
              : width;
      const rect = $el[0].getBoundingClientRect();
      if (w !== null) expect(rect.width, `${selector} ancho`).to.be.closeTo(w, 0.6);
      expect(rect.height, `${selector} alto`).to.be.closeTo(h, 0.6);
    });

const expectRadius = (selector: string, radius: string, index = 0) =>
  box(selector, index).then((b) => expect(b.radius, `${selector} radio`).to.eq(radius));

const gap = (above: string, below: string, expected: number, i = 0, j = 0) =>
  cy
    .get(above)
    .eq(i)
    .then(($a) =>
      cy
        .get(below)
        .eq(j)
        .then(($b) => {
          const a = $a[0].getBoundingClientRect();
          const b = $b[0].getBoundingClientRect();
          expect(b.top - a.bottom, `${above} → ${below}`).to.be.closeTo(expected, 0.6);
        })
    );

describe('Fidelidad al diseño de Stitch (390×844)', () => {
  beforeEach(() => cy.viewport(390, 844));

  const preview = (path: string) => cy.boot({ path: `/__dev/account/${path}` });

  it('cabecera común: 64 de alto, atrás 44×44, círculo decorativo 32 y tipografía de la marca', () => {
    preview('crear/normal');
    expectSize('app-account-header .inner', 'full', 64);
    expectSize('app-account-header button.back', 44, 44);
    expectSize('app-account-header .profile', 32, 32);
    cy.get('app-account-header .bar').should('have.css', 'position', 'fixed');
    cy.get('app-account-header h1')
      .should('have.css', 'font-size', '18px')
      .and('have.css', 'font-weight', '600');
  });

  it('Crear cuenta: tarjeta ilustrada 56/24, tarjetas de campo, entradas 48, aviso 28/24 y botones 52/44', () => {
    preview('crear/normal');
    expectRadius('.intro', '16px');
    expectSize('.intro-icon', 56, 56);
    expectSize('.intro-badge', 24, 24);
    expectRadius('app-account-field .field', '16px');
    box('app-account-field .field').then((b) => expect(b.padding).to.eq('16px'));
    expectSize('app-account-field .input', null, 48);
    expectRadius('app-account-field .input', '9999px');
    expectSize('app-account-field .rule app-icon', 16, 16);
    expectSize('.notice-icon', 28, 28);
    expectSize('.notice .box', 24, 24);
    expectSize('button.submit', 'page', 52);
    expectSize('button.cancel', 'page', 44);
    gap('.intro', 'app-account-field .field', 16);
    gap('app-account-field .field', 'app-account-field .field', 16, 0, 1);
  });

  it('Crear cuenta: la casilla y las contraseñas tienen zona táctil de al menos 44 px', () => {
    preview('crear/normal');
    expectSize('input.accept', 44, 44);
    cy.get('app-account-field button.toggle')
      .first()
      .then(($b) => {
        const style = $b[0].ownerDocument.defaultView?.getComputedStyle($b[0], '::after');
        const rect = $b[0].getBoundingClientRect();
        const extra = Math.abs(parseFloat(style?.top ?? '0'));
        expect(rect.height + extra * 2).to.be.at.least(44);
      });
  });

  it('Cambiar contraseña y Borrar cuenta usan las mismas tarjetas, entradas y botones que Crear cuenta', () => {
    preview('contrasena/normal');
    expectRadius('app-account-field .field', '16px');
    expectSize('app-account-field .input', null, 48);
    expectSize('button.submit', 'page', 52);
    expectSize('button.cancel', 'page', 44);

    preview('borrar/normal');
    expectRadius('.danger-box', '32px');
    expectRadius('.confirm', '16px');
    expectSize('app-account-field .input', null, 48);
    expectSize('button.submit', 'page', 52);
    expectSize('.confirm .box', 24, 24);
  });

  it('Iniciar sesión: tarjeta 24 con tesela 56, entradas 56 con radio 16 e icono, botones 52', () => {
    preview('entrar/form');
    expectRadius('.welcome', '24px');
    expectSize('.tile', 56, 56);
    expectRadius('.tile', '16px');
    expectSize('app-account-field .input', null, 56);
    expectRadius('app-account-field .input', '16px');
    cy.get('app-account-field .input').first().should('have.css', 'padding-left', '48px');
    expectSize('app-account-field .leading', 22, 22);
    expectSize('app-account-field .toggle', 44, 44);
    expectSize('button.submit', 'page', 52);
    expectSize('button.cancel', 'page', 52);
    gap('button.submit', 'button.cancel', 8);
  });

  it('Iniciar sesión: aviso de error con círculo 36 y radio 16', () => {
    preview('entrar/error');
    cy.get('app-account-field input.input').eq(0).type('ana');
    cy.get('app-account-field input.input').eq(1).type('mala-clave-1');
    cy.get('button.submit').click();
    expectRadius('.notice', '16px');
    expectSize('.notice-icon', 36, 36);
  });

  it('Hoja «Tareas de este móvil»: asa 48×6, radio superior 24, opciones y botones 52/44', () => {
    preview('entrar/sheet');
    cy.get('app-account-field input.input').eq(0).type('ana');
    cy.get('app-account-field input.input').eq(1).type('clave-segura-1');
    cy.get('button.submit').click();
    expectSize('.handle', 48, 6);
    cy.get('.sheet').should('have.css', 'border-top-left-radius', '24px');
    expectSize('.head-icon', 40, 40);
    expectRadius('.count', '16px');
    expectSize('.count-dot', 10, 10);
    expectSize('.option-icon', 28, 28);
    expectRadius('.option-bring', '16px');
    expectSize('button.bring', 'sheet', 52);
    expectSize('.sheet button.cancel', 'sheet', 44);

    cy.get('.option-only').click();
    cy.wait(400); // espera a que termine la animación de entrada
    expectSize('app-discard-confirm .badge', 56, 56);
    cy.get('app-discard-confirm .box').should('have.css', 'border-radius', '24px');
  });

  it('Cuenta sin cuenta: mascota 112/96/36, tarjetas radio 32, botones 54 y 50', () => {
    preview('cuenta/anonymous');
    expectSize('.mascot', 112, 112);
    expectSize('.mascot-circle', 96, 96);
    expectSize('.mascot-badge', 36, 36);
    expectRadius('.state-card', '32px');
    expectRadius('.switch-card', '32px');
    expectSize('.switch-icon', 40, 40);
    expectSize('.primary-action', 'page', 54);
    expectSize('.secondary-action', 'page', 50);
    gap('.state-card', '.switch-card', 24);
  });

  it('Cuenta con cuenta: avatar 64, insignia 20, filas con círculo 40, zona de peligro y botón 48', () => {
    preview('cuenta/account');
    expectSize('.avatar', 64, 64);
    expectSize('.verified', 20, 20);
    expectRadius('.user-card', '32px');
    expectRadius('.saved', '16px');
    expectRadius('.panel', '32px');
    expectSize('.row-icon', 40, 40);
    expectSize('.row', 'page', 72);
    expectRadius('.danger-box', '32px');
    expectSize('.danger-button', null, 48);
  });

  it('diálogo de cerrar sesión: caja radio 32, icono 48 y botones 48 con velo desenfocado', () => {
    preview('cuenta/dialog');
    cy.get('.scrim').should('have.css', 'backdrop-filter', 'blur(4px)');
    cy.get('app-account-logout-dialog .dialog').should('have.css', 'border-radius', '32px');
    expectSize('app-account-logout-dialog .badge', 48, 48);
    expectSize('app-account-logout-dialog .confirm', null, 48);
    expectSize('app-account-logout-dialog .cancel', null, 48);
  });

  it('lista: botón de perfil 44 con círculo de 36 y tarjeta de recordatorio con sus medidas', () => {
    cy.boot({ seed: (b) => void b.seedCompleted('Hecha antes', TODAY) });
    cy.get('app-account-reminder').should('be.visible');
    expectSize('app-profile-button a', 44, 44);
    expectSize('app-profile-button .circle', 36, 36);
    expectSize('app-account-reminder .card', null, 212, 0).then(() => undefined);
    expectRadius('app-account-reminder .card', '24px');
    expectSize('app-account-reminder .tile', 40, 40);
    expectSize('app-account-reminder .close', 32, 32);
    expectSize('app-account-reminder .create', null, 46);
    expectSize('app-account-reminder .later', null, 46);
    gap('app-progress-summary', 'app-account-reminder .card', 16);
  });

  it('no usa fuentes ni recursos externos: la tipografía es local', () => {
    preview('crear/normal');
    cy.document().then((doc) => {
      const external = Array.from(doc.querySelectorAll('link[rel="stylesheet"], script[src]'))
        .map((el) => el.getAttribute('href') ?? el.getAttribute('src') ?? '')
        .filter((url) => /^https?:\/\//.test(url) && !url.startsWith(doc.location.origin));
      expect(external, 'recursos externos').to.deep.eq([]);
      expect(doc.documentElement.innerHTML).to.not.match(/fonts\.(googleapis|gstatic)\.com/);
    });
    cy.get('body')
      .should('have.css', 'font-family')
      .and('match', /Plus Jakarta Sans/);
  });

  it('ninguna pantalla de cuenta desborda en horizontal', () => {
    for (const path of [
      'crear/normal',
      'contrasena/normal',
      'borrar/normal',
      'entrar/form',
      'cuenta/anonymous',
      'cuenta/account',
    ]) {
      preview(path);
      cy.document().then((doc) =>
        expect(doc.documentElement.scrollWidth, path).to.be.at.most(doc.documentElement.clientWidth)
      );
    }
    void PASSWORD;
  });
});
