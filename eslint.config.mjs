import nextConfig from 'eslint-config-next';

const config = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**', 'data/**', 'playwright-report/**', 'test-results/**'],
  },
];

export default config;
