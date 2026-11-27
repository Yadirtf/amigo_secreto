// Expo (SDK 52+) detects the pnpm monorepo automatically (watchFolders =
// workspace root, node_modules lookup in the app and the root).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workspace packages are TypeScript sources written with NodeNext-style
// ".js" specifiers (e.g. './rules/draw.js'): map them to the .ts file.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return resolve(context, moduleName.slice(0, -3), platform);
    } catch {
      // fall through to the normal resolution
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
