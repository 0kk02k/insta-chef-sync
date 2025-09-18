import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { Cookie, Shield, Wrench, BarChart3, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const CookieSettings = () => {
  const { consent, updateConsent, acceptAll, acceptNecessary, resetConsent } = useCookieConsent();

  const handleToggle = (category: 'functional' | 'analytics', value: boolean) => {
    updateConsent({ [category]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Cookie-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Necessary Cookies */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-500" />
                <Label className="font-medium">Notwendige Cookies</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Erforderlich für die grundlegende Funktionalität der Website, einschließlich 
                Benutzeranmeldung und Sicherheit. Diese können nicht deaktiviert werden.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Beispiele: Authentifizierung, Sicherheits-Token
              </p>
            </div>
            <Switch checked={true} disabled />
          </div>

          {/* Functional Cookies */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                <Label className="font-medium">Funktionale Cookies</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Speichern Ihre Präferenzen und Einstellungen, um Ihre Benutzererfahrung zu verbessern.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Beispiele: Sidebar-Status, Theme-Präferenzen, Sprache, Maßeinheiten
              </p>
            </div>
            <Switch 
              checked={consent.functional} 
              onCheckedChange={(value) => handleToggle('functional', value)}
            />
          </div>

          {/* Analytics Cookies */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg opacity-50">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <Label className="font-medium">Analytik-Cookies</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Helfen uns zu verstehen, wie Sie die Website nutzen, um sie zu verbessern.
                <span className="text-green-600 font-medium"> (Derzeit nicht verwendet)</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Beispiele: Besuchsstatistiken, Nutzungsmuster (zukünftig)
              </p>
            </div>
            <Switch 
              checked={consent.analytics} 
              onCheckedChange={(value) => handleToggle('analytics', value)}
              disabled
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={acceptAll} className="flex-1">
              Alle akzeptieren
            </Button>
            <Button onClick={acceptNecessary} variant="outline" className="flex-1">
              Nur notwendige
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Alle löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Cookies löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dies wird alle gespeicherten Cookies und Einstellungen löschen. 
                    Sie werden abgemeldet und müssen Ihre Präferenzen neu einstellen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={resetConsent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Alle löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {consent.hasConsented && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Zuletzt aktualisiert: {consent.lastUpdated ? 
                new Date(consent.lastUpdated).toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Unbekannt'
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};