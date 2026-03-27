const appJson = require('./app.json');

module.exports = () => {
  const allowCleartextTraffic = process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT === 'true';
  const plugins = Array.isArray(appJson.expo.plugins) ? [...appJson.expo.plugins] : [];

  if (!plugins.includes('expo-secure-store')) {
    plugins.push('expo-secure-store');
  }

  return {
    expo: {
      ...appJson.expo,
      plugins,
      android: {
        ...appJson.expo.android,
        usesCleartextTraffic: allowCleartextTraffic,
      },
    },
  };
};