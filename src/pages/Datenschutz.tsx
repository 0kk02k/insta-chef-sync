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
              className="text-primary hover:bg-primary/10 hover:text-primary border border-primary h-10 w-10"
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
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Datenschutzerklärung
            </CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Datenschutz auf einen Blick</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Allgemeine Hinweise</h3>
                <p className="text-muted-foreground">
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten 
                  passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie 
                  persönlich identifiziert werden können.
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
                  San Francisco, CA 94107, USA. Netlify erfasst in sogenannten Logfiles folgende Daten, die Ihr Browser 
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
                  <li>Von Ihnen erstellte Rezeptdaten (Titel, Zutaten, Anweisungen, Bilder)</li>
                  <li>Nutzungsstatistiken und Metadaten</li>
                  <li>Session-Daten für die Authentifizierung</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Die Datenverarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) oder 
                  zur Erfüllung des Vertrags (Art. 6 Abs. 1 lit. b DSGVO). Sie können Ihre Einwilligung jederzeit 
                  widerrufen.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies</h2>
                <p className="text-muted-foreground">
                  Diese Website verwendet Cookies, um die Funktionalität zu gewährleisten und Ihre Nutzererfahrung zu 
                  verbessern. Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden. Wir verwenden:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li><strong>Technisch notwendige Cookies:</strong> Für die Benutzeranmeldung und Session-Management</li>
                  <li><strong>Funktionale Cookies:</strong> Für die Speicherung Ihrer Präferenzen (z.B. Sprache, Maßeinheiten)</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden und 
                  Cookies nur im Einzelfall erlauben. Bei der Deaktivierung von Cookies kann die Funktionalität dieser 
                  Website eingeschränkt sein.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Ihre Rechte</h2>
                <p className="text-muted-foreground">
                  Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
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
                  Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer 
                  personenbezogenen Daten durch uns zu beschweren.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. SSL-Verschlüsselung</h2>
                <p className="text-muted-foreground">
                  Diese Seite nutzt aus Gründen der Sicherheit und zum Schutz der Übertragung vertraulicher Inhalte 
                  eine SSL-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile 
                  des Browsers von "http://" auf "https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
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