# Pinned toolchain and licenses

Use project Node22.23.3/npm10.9.9 without changing another project's default runtime.
All direct dependencies use exact versions; transitive versions/integrity are in package-lock.json.
`npm run licenses` generates metadata for every lockfile entry, including optional platform packages.
Package notices/license texts are distributed with the corresponding packages; final packaging review is T-077.

Verified primary package metadata at npm registry on 2026-10-05. TypeScript5.9.3 is within
typescript-eslint8.71.0 peer range (`>=4.8.4 <6.1.0`); Node22.23.3 satisfies the selected
Vite/Vitest/ESLint/Playwright requirements. Node22's built-in SQLite is experimental and is used only
for the temporary local development profile; SQL Server deployment uses mssql/Tedious.

References: [Vite guide](https://vite.dev/guide/), [Node22 SQLite](https://nodejs.org/docs/latest-v22.x/api/sqlite.html),
[mssql](https://github.com/tediousjs/node-mssql), [npm registry](https://registry.npmjs.org/).
SQL Server harness checks the actual16.x product version before fixture writes:
[SQL Server2022 version documentation](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/supported-version-and-edition-upgrades-2022).
