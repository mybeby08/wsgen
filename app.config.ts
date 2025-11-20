import { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'my-expo-app',
  slug: 'my-expo-app',
  version: '1.0.0',
  scheme: 'my-expo-app',
  platforms: ['ios', 'android'],
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router', ['expo-sqlite', { useLibSQL:true }]],
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },
  extra: {
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    tursoDbUrl: process.env.TURSO_DB_URL ?? process.env.EXPO_PUBLIC_TURSO_DB_URL ?? '',
    tursoDbAuthToken:
      process.env.TURSO_DB_AUTH_TOKEN ?? process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN ?? '',
  },
  developmentClient: {
    silentLaunch: false,
  },
}

export default config

