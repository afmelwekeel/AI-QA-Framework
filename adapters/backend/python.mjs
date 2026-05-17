export const id = 'python';
export function defaultBaseUrl() { return 'http://localhost:8000'; }
/** Picks up FastAPI / Flask / Django route files. */
export const routeFile = /(routes?|views|urls)\.py$/;
