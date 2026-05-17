export const id = 'vue';
export function detectSignals(pkg) { return Boolean(pkg?.dependencies?.['vue']); }
export function defaultBaseUrl() { return 'http://localhost:5173'; }
export const selectorPriority = ['data-testid', 'getByRole', 'getByLabel'];
