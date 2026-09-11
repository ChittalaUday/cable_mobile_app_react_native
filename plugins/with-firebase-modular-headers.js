const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const { withPodfile } = require('expo/config-plugins');

// Several Firebase Swift pods (AppCheckCore, FirebaseCrashlytics, FirebaseInAppMessaging, ...)
// don't define Clang modules, which CocoaPods needs to import them as static libraries.
// `use_modular_headers!` isn't exposed by expo-build-properties, so it's added here directly.
module.exports = function withFirebaseModularHeaders(config) {
  return withPodfile(config, (config) => {
    config.modResults.contents = mergeContents({
      src: config.modResults.contents,
      newSrc: 'use_modular_headers!',
      tag: 'firebase-modular-headers',
      anchor: /^platform :ios/,
      offset: 1,
      comment: '#',
    }).contents;
    return config;
  });
};
