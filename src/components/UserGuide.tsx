import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Share, Camera, Upload, Star, Heart, Search, ShoppingCart, AlertCircle, Settings } from 'lucide-react';

const UserGuide = () => {
  const guides = [
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Rezepte hinzufügen",
      description: "Laden Sie Ihre Lieblingsrezepte auf verschiedene Weise hoch:",
      steps: [
        "📄 PDF-Dateien hochladen und automatisch verarbeiten lassen",
        "📸 Screenshots von Rezepten aus Apps oder Websites hochladen",
        "🔗 Instagram-Links einfügen für automatische Verarbeitung",
        "✍️ Manuell Titel, Zutaten und Anweisungen eingeben"
      ]
    },
    {
      icon: <Share className="h-5 w-5" />,
      title: "Rezepte teilen",
      description: "Teilen Sie Ihre Rezepte mit anderen:",
      steps: [
        "Öffnen Sie ein Rezept aus Ihrer Sammlung",
        "Klicken Sie auf das Teilen-Symbol (↗)",
        "Das Rezept wird automatisch teilbar gemacht",
        "Der Link wird in die Zwischenablage kopiert",
        "Senden Sie den Link an Freunde und Familie"
      ]
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: "Rezepte bewerten",
      description: "Bewerten Sie Rezepte und lassen Sie andere wissen, wie sie Ihnen gefallen haben:",
      steps: [
        "Öffnen Sie ein veröffentlichtes Rezept",
        "Klicken Sie auf die Sterne unter dem Rezepttitel",
        "Wählen Sie 1-5 Sterne aus",
        "Ihre Bewertung wird sofort gespeichert"
      ]
    },
    {
      icon: <Heart className="h-5 w-5" />,
      title: "Rezepte favorisieren",
      description: "Markieren Sie Ihre Lieblingsrezepte:",
      steps: [
        "Klicken Sie auf das Herz-Symbol bei einem Rezept",
        "Favorisierte Rezepte werden in Ihrer persönlichen Sammlung hervorgehoben",
        "Nutzen Sie Favoriten, um Ihre besten Rezepte schnell zu finden"
      ]
    },
    {
      icon: <Search className="h-5 w-5" />,
      title: "Rezepte finden",
      description: "Entdecken Sie neue Rezepte:",
      steps: [
        "Nutzen Sie die Suchfunktion auf der Startseite",
        "Suchen Sie nach Rezeptnamen, Zutaten oder Kategorien",
        "Filtern Sie nach Ihren Präferenzen",
        "Durchstöbern Sie die Rezeptsammlung anderer Nutzer"
      ]
    },
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      title: "Einkaufslisten erstellen",
      description: "Erstellen Sie praktische Einkaufslisten aus Rezepten:",
      steps: [
        "Öffnen Sie ein Rezept",
        "Klicken Sie auf 'Zur Einkaufsliste hinzufügen'",
        "Wählen Sie eine bestehende Liste oder erstellen Sie eine neue",
        "Verwalten Sie Ihre Listen im Einkaufslisten-Bereich"
      ]
    },
    {
      icon: <Camera className="h-5 w-5" />,
      title: "Portionsrechner",
      description: "Passen Sie Rezeptmengen an Ihre Bedürfnisse an:",
      steps: [
        "Öffnen Sie ein Rezept mit definierten Portionen",
        "Nutzen Sie den Portionsrechner oben im Rezept",
        "Ändern Sie die Anzahl der gewünschten Portionen",
        "Alle Zutatenmenge werden automatisch angepasst"
      ]
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "Einstellungen verwalten",
      description: "Personalisieren Sie Ihre Erfahrung:",
      steps: [
        "Verwalten Sie Ihre Cookie-Einstellungen",
        "Entfernen Sie ignorierte Rezepte aus Ihrer Liste",
        "Überprüfen Sie Ihre Profil-Informationen",
        "Löschen Sie Ihr Konto, falls gewünscht (unwiderruflich)"
      ]
    }
  ];

  const securityTips = [
    "Teilen Sie nur Rezepte, die Sie selbst erstellt haben oder für die Sie die Rechte besitzen",
    "Geteilte Rezepte sind über den Link für jeden zugänglich",
    "Ihre persönlichen Daten werden nie ohne Ihre Zustimmung geteilt",
    "Sie können jederzeit Ihr Konto und alle Daten löschen"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink-900">
          <BookOpen className="h-5 w-5" />
          Benutzeranleitung
        </CardTitle>
        <CardDescription>
          Entdecken Sie alle Funktionen und lernen Sie, wie Sie das Beste aus der Rezept-App herausholen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {guides.map((guide, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-primary">{guide.icon}</div>
              <h3 className="font-semibold text-ink-900">{guide.title}</h3>
            </div>
            <p className="text-sm text-ink-600 ml-7">{guide.description}</p>
            <ul className="space-y-1 ml-7">
              {guide.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="text-sm text-ink-700">
                  {step}
                </li>
              ))}
            </ul>
            {index < guides.length - 1 && <Separator className="my-4" />}
          </div>
        ))}

        <Separator className="my-6" />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-warm" />
            <h3 className="font-semibold text-ink-900">Sicherheit & Datenschutz</h3>
          </div>
          <div className="bg-orange-warm/10 p-4 rounded-lg ml-7">
            <ul className="space-y-2">
              {securityTips.map((tip, index) => (
                <li key={index} className="text-sm text-ink-700 flex items-start gap-2">
                  <span className="text-orange-warm font-bold">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-accent-2/20 p-4 rounded-lg border border-border/30">
          <p className="text-sm text-ink-600">
            <strong>Tipp:</strong> Bei Fragen oder Problemen können Sie sich jederzeit an unser Support-Team wenden. 
            Wir helfen Ihnen gerne weiter!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserGuide;