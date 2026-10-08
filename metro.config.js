const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The fonts are small WOFF2 files; tell Metro to treat them as assets.
config.resolver.assetExts.push("woff2");

module.exports = config;
