import { defineConfig } from 'cypress';

// Las e2e arrancan la app con la configuración `e2e` de Angular (entorno ficticio) en el puerto 4300.
// Toda la red a Supabase se simula en `cypress/support/backend.ts`: nunca se toca el remoto.
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4300',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 390,
    viewportHeight: 844,
    video: false,
    screenshotsFolder: 'cypress/screenshots',
    defaultCommandTimeout: 6000,
    retries: { runMode: 1, openMode: 0 },
  },
});
