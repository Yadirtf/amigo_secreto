// Signs release builds with the Play *upload* key when the four
// ANDROID_UPLOAD_* variables are set (release workflow, see docs/DEPLOY.md).
// Without them, release builds keep the template's debug key (staging APK,
// e2e), so nothing changes for those builds.
/* global require, module, process */
// Config plugins are loaded by Node as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// entre-nos: upload signing';

// A separate top-level android { } block, appended at the end of the file:
// Gradle merges it with the template's, and it does not depend on where the
// template's own blocks end.
const SIGNING = `
${MARK}
def uploadStore = System.getenv("ANDROID_UPLOAD_STORE_FILE")
if (uploadStore) {
    android {
        signingConfigs {
            upload {
                storeFile file(uploadStore)
                storePassword System.getenv("ANDROID_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("ANDROID_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_UPLOAD_KEY_PASSWORD")
            }
        }
        buildTypes {
            release {
                signingConfig signingConfigs.upload
            }
        }
    }
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    // Only the release workflow sets the upload key (before prebuild); every
    // other build keeps the template's build.gradle untouched.
    if (!process.env.ANDROID_UPLOAD_STORE_FILE) return cfg;
    const src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    cfg.modResults.contents = `${src.trimEnd()}\n${SIGNING}`;
    return cfg;
  });
};
