import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  platform: 'node',
  target: 'node26',
  format: 'esm',
  dts: false,
  sourcemap: false,
  report: false,
  hash: false,
  deps: {
    alwaysBundle: [
      /^@clo835-project\/shared(?:\/.*)?$/,
      /^cors(?:\/.*)?$/,
      /^express(?:\/.*)?$/,
      /^ioredis(?:\/.*)?$/,
      'supports-color',
    ],
    onlyBundle: false,
  },
});
