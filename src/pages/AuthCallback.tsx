import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error('OAuth callback error:', error.message);
          // Redirect zur Login-Seite mit Fehlermeldung
          window.location.replace('/auth?error=oauth_failed');
          return;
        }
        
        // Erfolgreiche Anmeldung: Weiterleitung zur Startseite
        window.location.replace('/');
      } catch (err) {
        console.error('Unexpected error during OAuth callback:', err);
        window.location.replace('/auth?error=oauth_failed');
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-foreground">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;