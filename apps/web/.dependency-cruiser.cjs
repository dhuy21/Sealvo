/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'lib-and-stores-are-leaves',
      comment:
        'lib/ and stores/ hold framework-free logic and never depend on React layers above them',
      severity: 'error',
      from: { path: '^src/(lib|stores)/' },
      to: { path: '^src/(hooks|components|app|providers)/' },
    },
    {
      name: 'hooks-no-ui',
      comment: 'Data hooks do not depend on UI or routes',
      severity: 'error',
      from: { path: '^src/hooks/' },
      to: { path: '^src/(components|app|providers)/' },
    },
    {
      name: 'components-no-routes',
      comment: 'Components are reused by routes, not the other way round',
      severity: 'error',
      from: { path: '^src/components/' },
      to: { path: '^src/(app|providers)/' },
    },
    {
      name: 'no-api-code',
      comment: 'The web talks to the API over HTTP; shared contracts live in @sealvo/shared',
      severity: 'error',
      from: {},
      to: { path: 'apps/api/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.test\\.tsx?$' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
