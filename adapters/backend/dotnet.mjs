export const id = 'dotnet';
export function defaultBaseUrl() { return 'http://localhost:5000'; }
/** Convention: ASP.NET Core controllers under src/**\/*.csproj */
export const routeFile = /Controller\.cs$/;
