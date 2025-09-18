import React, { createContext, useContext, useState, useEffect } from 'react';

export type CookieCategory = 'necessary' | 'functional' | 'analytics';

export interface CookieConsent {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  hasConsented: boolean;
  lastUpdated?: Date;
}

interface CookieConsentContextType {
  consent: CookieConsent;
  updateConsent: (newConsent: Partial<CookieConsent>) => void;
  acceptAll: () => void;
  acceptNecessary: () => void;
  declineAll: () => void;
  resetConsent: () => void;
  hasUserInteracted: boolean;
}

const defaultConsent: CookieConsent = {
  necessary: true, // Always true
  functional: false,
  analytics: false,
  hasConsented: false,
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};

// Safe storage wrappers that respect consent
export const cookieStorage = {
  setItem: (key: string, value: string, category: CookieCategory = 'functional') => {
    const storedConsent = localStorage.getItem('cookie-consent');
    if (storedConsent) {
      const consent: CookieConsent = JSON.parse(storedConsent);
      if (category === 'necessary' || consent[category]) {
        if (category === 'necessary') {
          // Use sessionStorage for necessary cookies to be less persistent
          sessionStorage.setItem(key, value);
        } else {
          localStorage.setItem(key, value);
        }
      }
    }
  },
  getItem: (key: string, category: CookieCategory = 'functional'): string | null => {
    const storedConsent = localStorage.getItem('cookie-consent');
    if (storedConsent) {
      const consent: CookieConsent = JSON.parse(storedConsent);
      if (category === 'necessary' || consent[category]) {
        return category === 'necessary' 
          ? sessionStorage.getItem(key) || localStorage.getItem(key)
          : localStorage.getItem(key);
      }
    }
    return null;
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const setCookie = (name: string, value: string, category: CookieCategory = 'functional', maxAge: number = 86400) => {
  const storedConsent = localStorage.getItem('cookie-consent');
  if (storedConsent) {
    const consent: CookieConsent = JSON.parse(storedConsent);
    if (category === 'necessary' || consent[category]) {
      document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }
};

export const CookieConsentProvider = ({ children }: { children: React.ReactNode }) => {
  const [consent, setConsent] = useState<CookieConsent>(defaultConsent);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    // Load consent from localStorage on mount
    const storedConsent = localStorage.getItem('cookie-consent');
    if (storedConsent) {
      try {
        const parsed = JSON.parse(storedConsent);
        setConsent({ ...defaultConsent, ...parsed });
        setHasUserInteracted(parsed.hasConsented);
      } catch (error) {
        console.warn('Failed to parse stored cookie consent');
      }
    }
  }, []);

  const updateConsent = (newConsent: Partial<CookieConsent>) => {
    const updatedConsent = {
      ...consent,
      ...newConsent,
      necessary: true, // Always keep necessary cookies enabled
      hasConsented: true,
      lastUpdated: new Date(),
    };
    
    setConsent(updatedConsent);
    setHasUserInteracted(true);
    
    // Save to localStorage (this is allowed for consent management)
    localStorage.setItem('cookie-consent', JSON.stringify(updatedConsent));
    
    // Clean up storage if consent was revoked
    if (newConsent.functional === false) {
      // Clear functional storage items
      const keysToRemove = ['sidebar:state'];
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  };

  const acceptAll = () => {
    updateConsent({
      functional: true,
      analytics: true,
    });
  };

  const acceptNecessary = () => {
    updateConsent({
      functional: false,
      analytics: false,
    });
  };

  const declineAll = () => {
    acceptNecessary(); // Same as necessary only
  };

  const resetConsent = () => {
    localStorage.removeItem('cookie-consent');
    setConsent(defaultConsent);
    setHasUserInteracted(false);
    
    // Clear all non-necessary storage
    localStorage.removeItem('sidebar:state');
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  };

  const value = {
    consent,
    updateConsent,
    acceptAll,
    acceptNecessary,
    declineAll,
    resetConsent,
    hasUserInteracted,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};