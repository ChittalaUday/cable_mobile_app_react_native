const fs = require('node:fs');
const path = require('node:path');
const {
  AndroidConfig,
  withAndroidColors,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');

const { addMetaDataItemToMainApplication, getMainApplicationOrThrow } = AndroidConfig.Manifest;
const { assignColorValue } = AndroidConfig.Colors;

// The status bar icon must be a white silhouette on transparency. Android
// masks it, so a full-colour launcher icon — which is the fallback when no
// icon is declared — comes out as a solid white square. A vector keeps it
// crisp at every density without shipping five PNGs.
const ICON = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M12,6.8 L7.9,3.4 L9.2,1.9 L12,4.3 L14.8,1.9 L16.1,3.4 Z" />
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M4,8 h16 a2,2 0 0 1 2,2 v9 a2,2 0 0 1 -2,2 h-16 a2,2 0 0 1 -2,-2 v-9 a2,2 0 0 1 2,-2 z" />
</vector>
`;

// Tints the small icon and the app name in the notification shade.
const ACCENT = '#FF6C00';

// A channel the app actually creates. RNFB defaults this to "default", which
// nothing registers, so any push without an explicit channel lands in the
// system's own "Miscellaneous" bucket instead.
const FALLBACK_CHANNEL = 'general';

/** Marks one meta-data attribute as ours, for the manifest merger. */
function replaceOnMerge(application, name, attribute) {
  const item = (application['meta-data'] ?? []).find(entry => entry.$['android:name'] === name);

  if (item === undefined)
    throw new Error(`with-notification-icon: meta-data ${name} was not added`);

  item.$['tools:replace'] = attribute;
}

module.exports = function withNotificationIcon(config) {
  config = withDangerousMod(config, ['android', async (config) => {
    const dir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, 'ic_notification.xml'), ICON, 'utf8');
    return config;
  }]);

  config = withAndroidColors(config, (config) => {
    config.modResults = assignColorValue(config.modResults, {
      name: 'notification_icon_color',
      value: ACCENT,
    });
    return config;
  });

  return withAndroidManifest(config, (config) => {
    config.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = getMainApplicationOrThrow(config.modResults);

    addMetaDataItemToMainApplication(
      application,
      'com.google.firebase.messaging.default_notification_icon',
      '@drawable/ic_notification',
      'resource',
    );
    addMetaDataItemToMainApplication(
      application,
      'com.google.firebase.messaging.default_notification_color',
      '@color/notification_icon_color',
      'resource',
    );
    replaceOnMerge(application, 'com.google.firebase.messaging.default_notification_color', 'android:resource');
    addMetaDataItemToMainApplication(
      application,
      'com.google.firebase.messaging.default_notification_channel_id',
      FALLBACK_CHANNEL,
      'value',
    );
    replaceOnMerge(application, 'com.google.firebase.messaging.default_notification_channel_id', 'android:value');

    return config;
  });
};
