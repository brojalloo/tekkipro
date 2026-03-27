const { createRunOncePlugin, withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

function ensurePermission(androidManifest, permission) {
  const permissions = androidManifest.manifest['uses-permission'] || [];
  const existing = permissions.find((item) => item.$?.['android:name'] === permission.name);
  const next = { 'android:name': permission.name, ...permission.attrs };

  if (existing) {
    existing.$ = { ...(existing.$ || {}), ...next };
  } else {
    permissions.push({ $: next });
  }

  androidManifest.manifest['uses-permission'] = permissions;
}

const withThermalPrinterAndroid = (config) => withAndroidManifest(config, (config) => {
  const manifest = config.modResults;
  manifest.manifest.$ = manifest.manifest.$ || {};

  if (!manifest.manifest.$['xmlns:tools']) {
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }

  [
    { name: 'android.permission.INTERNET' },
    { name: 'android.permission.ACCESS_NETWORK_STATE' },
    {
      name: 'android.permission.BLUETOOTH_SCAN',
      attrs: {
        'android:usesPermissionFlags': 'neverForLocation',
        'tools:targetApi': '31',
      },
    },
    { name: 'android.permission.BLUETOOTH_CONNECT', attrs: { 'tools:targetApi': '31' } },
    { name: 'android.permission.BLUETOOTH', attrs: { 'android:maxSdkVersion': '30' } },
    { name: 'android.permission.BLUETOOTH_ADMIN', attrs: { 'android:maxSdkVersion': '30' } },
    { name: 'android.permission.ACCESS_FINE_LOCATION', attrs: { 'android:maxSdkVersion': '30' } },
  ].forEach((permission) => ensurePermission(manifest, permission));

  return config;
});

const withThermalPrinterIos = (config) => withInfoPlist(config, (config) => {
  config.modResults.NSBluetoothAlwaysUsageDescription =
    config.modResults.NSBluetoothAlwaysUsageDescription ||
    'Autoriser TekkiPro à utiliser le Bluetooth pour se connecter à une imprimante thermique.';
  config.modResults.NSBluetoothPeripheralUsageDescription =
    config.modResults.NSBluetoothPeripheralUsageDescription ||
    'Autoriser TekkiPro à détecter les imprimantes thermiques Bluetooth à proximité.';
  return config;
});

module.exports = createRunOncePlugin(
  (config) => withThermalPrinterIos(withThermalPrinterAndroid(config)),
  'with-thermal-printer',
  '1.0.0'
);