module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push(['babel-plugin-react-compiler', { target: '19' }]);
  plugins.push('react-native-worklets/plugin');

  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins,
  };
};
