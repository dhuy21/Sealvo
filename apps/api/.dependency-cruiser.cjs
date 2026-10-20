/** @type {import('dependency-cruiser').IConfiguration} */
const INFRA = '^src/(common|config|prisma|redis|rabbitmq|gemini)/';
const FEATURES =
  '^src/(account|activity|auth|dashboard|email|feedback|games|health|import|learning|maintenance|packages|reminder|scheduler|tts|words)/';
const SDK_OWNERS = {
  amqplib: 'rabbitmq',
  redis: 'redis',
  '@google/genai': 'gemini',
  '@google-cloud/text-to-speech': 'tts',
  '@aws-sdk/client-sesv2': 'email',
  nodemailer: 'email',
};

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'infra-no-features',
      comment: 'Infrastructure modules stay below the features that use them',
      severity: 'error',
      from: { path: INFRA, pathNot: '^src/config/testing\\.ts$' },
      to: { path: FEATURES },
    },
    {
      name: 'controllers-only-from-modules',
      comment: 'Controllers are wired by their Nest module and never imported as code',
      severity: 'error',
      from: { pathNot: ['\\.module\\.ts$', '\\.spec\\.ts$'] },
      to: { path: '\\.controller\\.ts$' },
    },
    {
      name: 'auth-public-surface',
      comment: 'Other features use auth only through its guards, decorators and module',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: ['^src/auth/', '\\.spec\\.ts$', '^src/config/testing\\.ts$'],
      },
      to: {
        path: '^src/auth/',
        pathNot: [
          '^src/auth/(guards|decorators)/',
          '^src/auth/auth\\.module\\.ts$',
          '^src/auth/email-change\\.service\\.ts$',
          '^src/auth/dto/register\\.dto\\.ts$',
        ],
      },
    },
    {
      name: 'words-to-import-surface',
      comment: 'Words reach the import feature only through its module and bulk insert service',
      severity: 'error',
      from: { path: '^src/words/', pathNot: '\\.spec\\.ts$' },
      to: {
        path: '^src/import/',
        pathNot: ['^src/import/import\\.module\\.ts$', '^src/import/bulk-words\\.service\\.ts$'],
      },
    },
    {
      name: 'worker-no-http',
      comment: 'The worker process serves no HTTP routes',
      severity: 'error',
      from: { path: '^src/worker(\\.module)?\\.ts$' },
      to: { path: '\\.controller\\.ts$', reachable: true },
    },
    {
      name: 'scheduler-no-http',
      comment: 'The scheduler process serves no HTTP routes',
      severity: 'error',
      from: { path: '^src/scheduler(\\.module)?\\.ts$' },
      to: { path: '\\.controller\\.ts$', reachable: true },
    },
    {
      name: 'scheduler-stays-thin',
      comment: 'The scheduler only triggers HTTP cron endpoints; it never loads feature code',
      severity: 'error',
      from: { path: '^src/scheduler' },
      to: { path: FEATURES, pathNot: ['^src/scheduler/', '^src/health/heartbeat\\.ts$'] },
    },
    ...Object.entries(SDK_OWNERS).map(([sdk, owner]) => ({
      name: 'sdk-confinement',
      comment: `${sdk} is wrapped by src/${owner}/ only`,
      severity: 'error',
      from: { pathNot: `^src/${owner}/` },
      to: { path: `node_modules/${sdk}/`, dependencyTypesNot: ['type-only'] },
    })),
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.spec\\.ts$' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
