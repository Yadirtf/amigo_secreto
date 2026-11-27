// Signs release builds with the Play *upload* key when the four
// ANDROID_UPLOAD_* variables are set (release workflow, see docs/DEPLOY.md).
// Without them, release builds keep the template's debug key (staging APK,
// e2e), so nothing changes for those builds.
/* global require, module */
// Config plugins are loaded by Node as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// entre-nos: upload signing';

const SIGNING = `
    ${MARK}
    def uploadStore = System.getenv("ANDROID_UPLOAD_STORE_FILE")
    if (uploadStore) {
        signingConfigs {
            upload {
                storeFile file(uploadStore)
                storePassword System.getenv("ANDROID_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("ANDROID_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_UPLOAD_KEY_PASSWORD")
            }
        }
        buildTypes.release.signingConfig signingConfigs.upload
    }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    // Append inside the android { } block, after buildTypes is declared.
    const idx = src.lastIndexOf('\n}', src.indexOf('dependencies {'));
    if (idx < 0) throw new Error('withReleaseSigning: android block not found in app/build.gradle');
    cfg.modResults.contents = src.slice(0, idx) + '\n' + SIGNING + src.slice(idx);
    return cfg;
  });
};
