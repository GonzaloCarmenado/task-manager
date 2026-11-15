import { FakeBackend, NOW } from './backend';

/** Clave con la que la app guarda su sesión (ver `AUTH_STORAGE_KEY`). */
const AUTH_STORAGE_KEY = 'task-manager-auth';

declare global {
  namespace Cypress {
    interface Chainable {
      /** Crea el Supabase simulado, fija la fecha y abre la app. Devuelve el backend para sembrar y comprobar. */
      boot(options?: {
        path?: string;
        seed?: (backend: FakeBackend) => void;
        /** Arranca con la sesión de esta cuenta (creada antes en `seed` con `addAccount`). */
        signedInAs?: string;
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
  cy.visit(options.path ?? '/', {
    onBeforeLoad(win) {
      if (options.signedInAs) {
        win.localStorage.setItem(AUTH_STORAGE_KEY, backend.storedSession(options.signedInAs));
      }
    },
  });
  return cy.wrap(backend, { log: false });
});
