import { FakeBackend, NOW } from './backend';

declare global {
  namespace Cypress {
    interface Chainable {
      /** Crea el Supabase simulado, fija la fecha y abre la app. Devuelve el backend para sembrar y comprobar. */
      boot(options?: {
        path?: string;
        seed?: (backend: FakeBackend) => void;
      }): Chainable<FakeBackend>;
    }
  }
}

Cypress.Commands.add('boot', (options = {}) => {
  const backend = new FakeBackend();
  options.seed?.(backend);
  backend.install();
  // Solo se simula `Date` (no los temporizadores): hoy es siempre el sábado 14/11/2026 a las 10:00.
  cy.clock(NOW, ['Date']);
  cy.visit(options.path ?? '/');
  return cy.wrap(backend, { log: false });
});
