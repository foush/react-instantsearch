const wrapWarningWithDevCheck = require('./scripts/babel/wrap-warning-with-dev-check');

const isES = process.env.BABEL_ENV === 'es';
const isRollup = process.env.BABEL_ENV === 'rollup';

const clean = (x) => x.filter(Boolean);

module.exports = (api) => {
  const isTest = api.env('test');
  const targets = {};

  if (!isTest) {
    targets.browsers = ['last 2 versions', 'ie >= 9'];
  } else {
    targets.node = true;
  }

  return {
    presets: [
      '@babel/preset-typescript',
      [
        '@babel/preset-env',
        {
          modules: !isES && !isRollup ? 'commonjs' : false,
          targets,
        },
      ],
      '@babel/preset-react',
    ],
    plugins: clean([
      '@babel/plugin-proposal-class-properties',
      isRollup && 'babel-plugin-transform-react-remove-prop-types',
      wrapWarningWithDevCheck,
      [
        'inline-replace-variables',
        {
          __DEV__: {
            type: 'node',
            replacement: "process.env.NODE_ENV !== 'production'",
          },
        },
      ],
    ]),
    overrides: [
      {
        test: 'packages/*',
        plugins: [
          [
            '@babel/plugin-transform-runtime',
            {
              corejs: false,
              helpers: true,
              regenerator: false,
              useESModules: isES || isRollup,
            },
          ],
        ],
      },
      {
        test: 'packages/react-instantsearch-dom-maps',
        plugins: clean([
          '@babel/plugin-syntax-dynamic-import',
          !isRollup && 'babel-plugin-dynamic-import-node',
        ]),
      },
    ],
  };
};
