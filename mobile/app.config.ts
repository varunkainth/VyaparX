import type { ExpoConfig } from 'expo/config';

const passkeyDomain = process.env.EXPO_PUBLIC_PASSKEY_DOMAIN?.trim();
const iosAssociatedDomains = passkeyDomain ? [`webcredentials:${passkeyDomain}`, `applinks:${passkeyDomain}`] : [];
const androidIntentFilters = passkeyDomain
  ? [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          { host: passkeyDomain, pathPrefix: '/reset-password', scheme: 'https' },
          { host: passkeyDomain, pathPrefix: '/verify-email', scheme: 'https' },
        ],
      },
    ]
  : [];

const config: ExpoConfig = {
  name: 'VyaparX Mobile',
  slug: 'vyaparx-mobile',
  version: '1.0.0',
  scheme: 'vyaparx-mobile',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        defaultChannel: 'default',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow VyaparX to use the camera for scanning documents and attaching images.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Allow VyaparX to access photos and files for attachments and saved documents.',
        savePhotosPermission: 'Allow VyaparX to save invoices and exported files to your library.',
      },
    ],
  ],
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    associatedDomains: iosAssociatedDomains,
    bundleIdentifier: 'com.vyaparx.mobile',
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    intentFilters: androidIntentFilters,
    package: 'com.vyaparx.mobile',
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  experiments: {
    typedRoutes: false,
  },
  extra: {
    eas: {
      projectId: '69cf5216-2444-4e9e-9a19-5061d8187153',
    },
  },
};

export default config;
