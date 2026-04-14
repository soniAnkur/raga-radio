import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ragaradio.app',
  appName: 'Raga Radio',
  webDir: 'public',

  server: {
    url: 'https://ragaradio.vercel.app',
  },

  ios: {
    // Allow the WebView to extend under the status bar and home indicator
    // so our CSS safe-area vars control the insets (not the system).
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
    backgroundColor: '#0A0A0C',
  },

  plugins: {
    StatusBar: {
      // Light text / icons on the dark #0A0A0C background
      style: 'LIGHT',
      backgroundColor: '#0A0A0C',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0A0C',
      showSpinner: false,
      // Prevent the splash from clipping content during fade-out
      fadeInDuration: 200,
      fadeOutDuration: 300,
    },
  },
};

export default config;
