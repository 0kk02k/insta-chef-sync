import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Share, Camera, Upload, Star, Heart, Search, ShoppingCart, AlertCircle, Settings } from 'lucide-react';

const UserGuide = () => {
  const guides = [
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Rezepte hinzufügen",
      steps: [
        "📄 PDF-Dateien hochladen (bis zu 10 PDFs gleichzeitig zur Stapelverarbeitung)",
        "📸 Screenshots von Rezepten hochladen (mehrere Screenshots können zu einem Rezept zusammengefügt werden)",
        "🔗 Webseiten-Links einfügen für automatische Verarbeitung",
        "✍️ Manuell Titel, Zutaten und Anweisungen eingeben",
        "🏷️ Rezepte mit Hashtags versehen für bessere Auffindbarkeit",
        "🎨 KI-generierte Bilder aus dem Rezept erstellen lassen oder eigene Bilder hinzufügen"
      ]
    },
    {
      icon: <Search className="h-5 w-5" />,
      title: "Rezepte finden & teilen",
      steps: [
        "Suchen Sie nach Rezeptnamen, Zutaten oder Hashtags",
        "Private Links erstellen für einzelne Rezepte",
        "Rezepte öffentlich veröffentlichen",
        "Veröffentlichte Rezepte anderer Nutzer kommentieren",
        "Fremde Rezepte zur eigenen Weiterentwicklung kopieren",
        "Unerwünschte Rezepte ignorieren"
      ]
    },
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      title: "Einkaufslisten erstellen",
      steps: [
        "Öffnen Sie ein Rezept",
        "Klicken Sie auf 'Zur Einkaufsliste hinzufügen'",
        "Wählen Sie eine bestehende Liste oder erstellen Sie eine neue",
        "Verwalten Sie Ihre Listen im Einkaufslisten-Bereich"
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
      </CardHeader>
      <CardContent className="space-y-6">
        {guides.map((guide, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-primary">{guide.icon}</div>
              <h3 className="font-semibold text-ink-900">{guide.title}</h3>
            </div>
            
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
      </CardContent>
    </Card>
  );
};

export default UserGuide;