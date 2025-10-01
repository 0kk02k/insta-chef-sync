import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/Footer';

const Datenschutz = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-warm/5 via-purple-soft/5 to-pink-vibrant/5 flex flex-col">
      {/* Header with dark blue background */}
      <div className="header" style={{ background: 'var(--gradient-header)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Button 
              size="icon"
              variant="ghost" 
              onClick={() => navigate('/')}
              className="bg-white text-primary border border-primary h-10 w-10 hover:bg-white hover:text-primary"
              style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-primary">
              Datenschutzerklärung
            </CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Datenschutz auf einen Blick</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Allgemeine Hinweise</h3>
                <p className="text-muted-foreground">
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit deinen personenbezogenen Daten 
                  passiert, wenn du diese Website besuchst. Personenbezogene Daten sind alle Daten, mit denen du 
                  persönlich identifiziert werden kannst.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Verantwortliche Stelle</h2>
                <p className="text-muted-foreground">
                  Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
                </p>
                <div className="text-muted-foreground mt-2">
                  <p>Okko Prothmann</p>
                  <p>Boddinstr 14</p>
                  <p>12053 Berlin</p>
                  <p>Deutschland</p>
                </div>
                <p className="text-muted-foreground mt-2">
                  Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen 
                  über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Hosting</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Netlify</h3>
                <p className="text-muted-foreground">
                  Diese Website wird bei Netlify gehostet. Anbieter ist Netlify, Inc., 2325 3rd Street, Suite 215, 
                  San Francisco, CA 94107, USA. Netlify erfasst in sogenannten Logfiles folgende Daten, die dein Browser 
                  übermittelt:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>IP-Adresse</li>
                  <li>Datum und Uhrzeit der Anfrage</li>
                  <li>Zeitzonendifferenz zur Greenwich Mean Time</li>
                  <li>Inhalt der Anforderung</li>
                  <li>HTTP-Statuscode</li>
                  <li>Übertragene Datenmenge</li>
                  <li>Website, von der die Anforderung kommt</li>
                  <li>Informationen zu Browser und Betriebssystem</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Das Hosting erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren potenziellen und bestehenden 
                  Kunden (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse einer sicheren, schnellen und effizienten 
                  Bereitstellung unseres Online-Angebots durch einen professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Datenverarbeitung durch Supabase</h2>
                <p className="text-muted-foreground">
                  Diese Anwendung nutzt Supabase für Backend-Services wie Datenbank, Authentifizierung und Speicher. 
                  Supabase Inc. mit Sitz in San Francisco, USA, verarbeitet folgende Daten:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>Benutzerdaten (E-Mail-Adresse, Name) bei der Registrierung</li>
                  <li>Von dir erstellte Rezeptdaten (Titel, Zutaten, Anweisungen, Bilder)</li>
                  <li>Nutzungsstatistiken und Metadaten</li>
                  <li>Session-Daten für die Authentifizierung</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Die Datenverarbeitung erfolgt auf Grundlage deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) oder 
                  zur Erfüllung des Vertrags (Art. 6 Abs. 1 lit. b DSGVO). Du kannst deine Einwilligung jederzeit 
                  widerrufen.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies und lokale Speicherung</h2>
                <p className="text-muted-foreground mb-4">
                  Diese Website verwendet Cookies und lokale Speichertechnologien gemäß Art. 6 Abs. 1 lit. a DSGVO 
                  (Einwilligung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen). Wir holen vor der Verwendung 
                  nicht-notwendiger Cookies deine ausdrückliche Einwilligung ein.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2">5.1 Kategorien von Cookies</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground">Notwendige Cookies</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Zweck:</strong> Ermöglichen grundlegende Webseitenfunktionen und Sicherheit<br/>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen)<br/>
                      <strong>Speicherdauer:</strong> Session oder bis zu 7 Tage<br/>
                      <strong>Beispiele:</strong> Authentifizierung, Sicherheits-Token, Session-Management
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-foreground">Funktionale Cookies</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Zweck:</strong> Speicherung von Benutzereinstellungen und -präferenzen<br/>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)<br/>
                      <strong>Speicherdauer:</strong> Bis zu 1 Jahr<br/>
                      <strong>Beispiele:</strong> Sidebar-Status, Theme-Präferenzen, Sprache, Maßeinheiten<br/>
                      <strong>Deaktivierung:</strong> Können in den Cookie-Einstellungen deaktiviert werden
                    </p>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-4">5.2 Deine Wahlmöglichkeiten</h3>
                <p className="text-muted-foreground mb-2">
                  Du hast folgende Optionen bezüglich Cookies:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Alle Cookies akzeptieren</li>
                  <li>Nur notwendige Cookies akzeptieren</li>
                  <li>Individuelle Einstellungen in den Cookie-Präferenzen vornehmen</li>
                  <li>Alle Cookies und gespeicherten Daten löschen</li>
                </ul>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-4">5.3 Einwilligung widerrufen</h3>
                <p className="text-muted-foreground">
                  Du kannst deine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. 
                  Besuche dazu die <a href="/settings" className="underline hover:no-underline">Einstellungen</a> 
                  oder lösche die Cookies in deinem Browser. Die Rechtmäßigkeit der aufgrund der Einwilligung 
                  bis zum Widerruf erfolgten Verarbeitung wird dadurch nicht berührt.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-4">5.4 Auswirkungen bei Ablehnung</h3>
                <p className="text-muted-foreground">
                  Bei Ablehnung funktionaler Cookies sind folgende Einschränkungen möglich:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Benutzereinstellungen werden nicht gespeichert</li>
                  <li>Theme-Präferenzen gehen nach Browserschließung verloren</li>
                  <li>Sprach- und Maßeinheiteneinstellungen müssen bei jedem Besuch neu gewählt werden</li>
                  <li>UI-Präferenzen (z.B. Sidebar-Status) werden nicht persistent gespeichert</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Deine Rechte</h2>
                <p className="text-muted-foreground">
                  Du hast folgende Rechte bezüglich deiner personenbezogenen Daten:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
                  <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
                  <li>Recht auf Löschung (Art. 17 DSGVO)</li>
                  <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                  <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
                  <li>Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Du hast zudem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung deiner 
                  personenbezogenen Daten durch uns zu beschweren.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. SSL-Verschlüsselung</h2>
                <p className="text-muted-foreground">
                  Diese Seite nutzt aus Gründen der Sicherheit und zum Schutz der Übertragung vertraulicher Inhalte 
                  eine SSL-Verschlüsselung. Eine verschlüsselte Verbindung erkennst du daran, dass die Adresszeile 
                  des Browsers von "http://" auf "https://" wechselt und an dem Schloss-Symbol in deiner Browserzeile.
                </p>
              </section>

              <section>
                <p className="text-muted-foreground text-sm">
                  <strong>Stand der Datenschutzerklärung:</strong> {new Date().toLocaleDateString('de-DE')}
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Datenschutz;