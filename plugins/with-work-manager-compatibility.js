const { withAppBuildGradle } = require('expo/config-plugins');

const workManagerKtxDependency =
  'implementation("androidx.work:work-runtime-ktx:2.8.1")';

module.exports = function withWorkManagerCompatibility(config) {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;

    if (modResults.language !== 'groovy') {
      throw new Error('Expected android/app/build.gradle to use Groovy.');
    }

    if (modResults.contents.includes(workManagerKtxDependency)) {
      return config;
    }

    const dependenciesBlock = /^dependencies\s*\{/m;

    if (!dependenciesBlock.test(modResults.contents)) {
      throw new Error('Could not find the Android app dependencies block.');
    }

    modResults.contents = modResults.contents.replace(
      dependenciesBlock,
      (match) =>
        `${match}\n    // Keep the KTX artifact aligned with react-native-android-widget's WorkManager runtime.\n    ${workManagerKtxDependency}`,
    );

    return config;
  });
};
