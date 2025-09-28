import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { X, Cookie, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieBanner = () => {
  const { hasUserInteracted, acceptAll, acceptNecessary, consent } = useCookieConsent();

  // Don't show banner if user has already interacted
  if (hasUserInteracted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <Card className="max-w-2xl shadow-lg border border-border/50 bg-background/95 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Cookie-Einstellungen</h3>
                <p className="text-sm text-muted-foreground">
                  Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten. 
                  Notwendige Cookies ermöglichen grundlegende Funktionen, funktionale Cookies 
                  speichern deine Präferenzen.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={acceptAll}
                  className="flex-1"
                  size="sm"
                >
                  Alle akzeptieren
                </Button>
                <Button 
                  onClick={acceptNecessary}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Nur notwendige
                </Button>
                <Button 
                  asChild
                  variant="ghost" 
                  size="sm"
                  className="flex-1"
                >
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Einstellungen
                  </Link>
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Mehr Informationen in unserer{' '}
                <Link to="/datenschutz" className="underline hover:no-underline">
                  Datenschutzerklärung
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};