# Prompt: Analyze Project

INPUT: absolute path to a project root.
OUTPUT: JSON matching `core/project.config.json` schema.

Steps:
1. Look for `package.json`, `*.csproj`, `*.sln`, `pom.xml`, `pyproject.toml`, `go.mod`.
2. Identify frontend / backend / DB / auth.
3. Enumerate routes by parsing route files (Angular, React, Vue, ASP.NET, Spring, FastAPI).
4. Never invent fields — emit `unknown` if unsure.
