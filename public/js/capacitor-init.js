/**
 * Raga Radio — Capacitor Native Initialisation
 *
 * Loaded before app.js. Configures the status bar and hides the splash
 * screen once the DOM is ready. Only runs when inside a native Capacitor
 * container; silently no-ops in a plain browser.
 */

(function () {
  'use strict';

  // Capacitor global is injected by the native WebView bridge.
  // If it isn't present we're running in a regular browser — do nothing.
  if (typeof Capacitor === 'undefined') return;

  var Plugins = Capacitor.Plugins;

  // ------------------------------------------------------------------ //
  // Status Bar
  // Only available on iOS and Android native builds.
  // Style.Dark  = dark icons/text  (use on light backgrounds)
  // Style.Light = light icons/text (use on dark backgrounds — our case)
  // ------------------------------------------------------------------ //
  function configureStatusBar() {
    var StatusBar = Plugins && Plugins.StatusBar;
    if (!StatusBar) return;

    var platform = Capacitor.getPlatform();

    // Light text / icons so they are visible on #0A0A0C
    StatusBar.setStyle({ style: 'LIGHT' }).catch(function () {});

    if (platform === 'ios') {
      // On iOS we extend the WebView under the status bar and rely on
      // env(safe-area-inset-top) in CSS, so overlayWebView stays true.
      StatusBar.setOverlaysWebView({ overlay: true }).catch(function () {});
    }

    if (platform === 'android') {
      // On Android set an explicit background colour so the bar matches.
      StatusBar.setBackgroundColor({ color: '#0A0A0C' }).catch(function () {});
      // On Android we also overlay so our padding-top handles the inset.
      StatusBar.setOverlaysWebView({ overlay: true }).catch(function () {});
    }
  }

  // ------------------------------------------------------------------ //
  // Splash Screen
  // ------------------------------------------------------------------ //
  function hideSplashScreen() {
    var SplashScreen = Plugins && Plugins.SplashScreen;
    if (!SplashScreen) return;
    SplashScreen.hide({ fadeOutDuration: 300 }).catch(function () {});
  }

  // Run as early as possible (status bar config needs no DOM)
  configureStatusBar();

  // Hide splash only after the document content is fully parsed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideSplashScreen);
  } else {
    hideSplashScreen();
  }
})();
