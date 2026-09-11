const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const META_DATA_FCM_NOTIFICATION_DEFAULT_CHANNEL_ID = 'com.google.firebase.messaging.default_notification_channel_id';

// expo-notifications writes this meta-data to route FCM messages to our default channel, but
// @react-native-firebase/messaging's own manifest declares the same key with an empty value,
// which fails the manifest merge. Mark ours as the one that wins.
module.exports = function withFcmChannelToolsReplace(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    mainApplication['meta-data'] = mainApplication['meta-data'] ?? [];

    const metaData = mainApplication['meta-data'].find(
      item => item.$['android:name'] === META_DATA_FCM_NOTIFICATION_DEFAULT_CHANNEL_ID,
    );

    // Upsert so this wins regardless of whether expo-notifications' own mod (which sets the
    // value but not this attribute) has already run - if it runs later it only updates the
    // value in place and leaves tools:replace untouched.
    if (metaData) {
      metaData.$['tools:replace'] = 'android:value';
    }
    else {
      mainApplication['meta-data'].push({
        $: {
          'android:name': META_DATA_FCM_NOTIFICATION_DEFAULT_CHANNEL_ID,
          'android:value': 'default',
          'tools:replace': 'android:value',
        },
      });
    }

    return config;
  });
};
