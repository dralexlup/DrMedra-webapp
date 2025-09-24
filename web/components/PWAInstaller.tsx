"use client";
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                             (window.navigator as any).standalone ||
                             document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    // Check if iOS
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isIOSDevice);
    };

    checkStandalone();
    checkIOS();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install banner after a delay if not standalone
      if (!isStandalone) {
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 3000); // Show after 3 seconds
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log('DrMedra PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS, show instructions
      if (isIOS) {
        setShowIOSInstructions(true);
        return;
      }
      return;
    }

    setShowInstallBanner(false);
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const dismissIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

  // Don't show if already installed or dismissed this session
  if (isStandalone || sessionStorage.getItem('pwa-banner-dismissed')) {
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      {showInstallBanner && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          background: 'var(--primary-color)',
          color: 'white',
          padding: '1rem',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <div className="font-semibold">Install DrMedra App</div>
            <div className="text-sm" style={{ opacity: 0.9 }}>
              Get quick access to your medical assistant
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleInstallClick}
              className="btn"
              style={{
                background: 'white',
                color: 'var(--primary-color)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                border: 'none'
              }}
            >
              Install
            </button>
            <button
              onClick={dismissBanner}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                fontSize: '1rem'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* iOS Installation Instructions */}
      {showIOSInstructions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius)',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--primary-color)' }}>
              📱 Install DrMedra on iOS
            </h3>
            <div className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <p className="mb-3">To install DrMedra on your iPhone or iPad:</p>
              <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li className="mb-2">1. Tap the <strong>Share</strong> button <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>📤</span> in Safari</li>
                <li className="mb-2">2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li className="mb-2">3. Tap <strong>"Add"</strong> in the top right</li>
                <li>4. DrMedra will appear on your home screen!</li>
              </ol>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Note: This feature is only available in Safari browser
              </p>
            </div>
            <button
              onClick={dismissIOSInstructions}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}