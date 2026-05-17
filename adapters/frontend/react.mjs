export const id = 'react';
export function detectSignals(pkg) { return Boolean(pkg?.dependencies?.['react']); }
export function defaultBaseUrl() { return 'http://localhost:3000'; }
export const selectorPriority = ['data-testid', 'getByRole', 'getByLabel'];
