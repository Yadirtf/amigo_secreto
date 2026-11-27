// Removes console.* calls from production bundles (MASVS: no data in logs).
module.exports = function (api) {
  api.cache(true);
  const plugins = [];
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error'] }]);
  }
  return { presets: ['babel-preset-expo'], plugins };
};
