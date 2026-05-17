/**
 * Frontend adapter: Angular.
 * Knows how to enumerate routes from app.routes.ts / app-routing.module.ts.
 * Add similar adapters for React / Vue / Blazor as needed.
 */
export const id = 'angular';
export function detectSignals(packageJson) {
  return Boolean(packageJson?.dependencies?.['@angular/core']);
}
export function defaultBaseUrl() { return 'http://localhost:4200'; }
export const selectorPriority = ['data-testid', 'getByRole', 'getByLabel'];
