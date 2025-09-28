import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/cookieAwareClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Trash2, User, ArrowLeft, BookOpen, Cookie, EyeOff } from 'lucide-react';
import Footer from '@/components/Footer';
import { CookieSettings } from '@/components/CookieSettings';
import IgnoredRecipesList from '@/components/IgnoredRecipesList';
import UserGuide from '@/components/UserGuide';

interface Profile {
  display_name: string;
  email: string;
  language: string;
  measurement_unit: string;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSecondDialog, setShowSecondDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile for user ID:', user?.id);
      
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email, language, measurement_unit')
        .eq('id', user.id)
        .single();

      console.log('Profile fetch result:', { data, error });

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Profil konnte nicht geladen werden."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'LÖSCHEN') {
      toast({
        variant: "destructive",
        title: "Bestätigung erforderlich",
        description: "Bitte geben Sie 'LÖSCHEN' ein, um fortzufahren."
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      toast({
        title: "Konto gelöscht",
        description: "Ihr Konto wurde erfolgreich gelöscht."
      });

      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Konto konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut."
      });
    } finally {
      setIsDeleting(false);
      setShowSecondDialog(false);
      setDeleteConfirmation('');
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-warm/5 via-purple-soft/5 to-pink-vibrant/5 flex flex-col">
      {/* Header with dark blue background */}
      <div className="header" style={{ background: 'var(--gradient-header)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              size="icon"
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-primary border border-primary h-10 w-10 bg-white hover:bg-white"
              style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Anleitung
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profilinformationen
            </TabsTrigger>
            <TabsTrigger value="cookies" className="flex items-center gap-2">
              <Cookie className="h-4 w-4" />
              Cookieeinstellungen
            </TabsTrigger>
            <TabsTrigger value="ignored" className="flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Ignorierte Rezepte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-6">
            <UserGuide />
          </TabsContent>

          <TabsContent value="profile" className="mt-6 space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-ink-900">
                  <User className="h-5 w-5" />
                  Profil-Informationen
                </CardTitle>
                <CardDescription>
                  Hier können Sie Ihre Kontoinformationen einsehen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-ink-700">Anzeigename</Label>
                  <Input 
                    value={profile?.display_name || ''} 
                    disabled 
                    className="bg-accent-2/20 border-border/30"
                  />
                </div>
                <div>
                  <Label className="text-ink-700">E-Mail</Label>
                  <Input 
                    value={profile?.email || ''} 
                    disabled 
                    className="bg-accent-2/20 border-border/30"
                  />
                </div>
                <div>
                  <Label className="text-ink-700">Sprache</Label>
                  <Input 
                    value={profile?.language || ''} 
                    disabled 
                    className="bg-accent-2/20 border-border/30"
                  />
                </div>
                <div>
                  <Label className="text-ink-700">Maßeinheit</Label>
                  <Input 
                    value={profile?.measurement_unit || ''} 
                    disabled 
                    className="bg-accent-2/20 border-border/30"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Delete Account Section */}
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Konto löschen
                </CardTitle>
                <CardDescription>
                  Das Löschen Ihres Kontos ist unwiderruflich. Alle Ihre Daten werden permanent entfernt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-destructive/10 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-destructive mb-2">Was wird gelöscht:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ihr Benutzerprofil</li>
                    <li>• Alle Ihre Rezepte</li>
                    <li>• Alle Ihre Kommentare</li>
                    <li>• Alle gespeicherten Präferenzen</li>
                  </ul>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Konto permanent löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. Ihr Konto und alle zugehörigen Daten werden permanent gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => setShowSecondDialog(true)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Fortfahren
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showSecondDialog} onOpenChange={setShowSecondDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finale Bestätigung</AlertDialogTitle>
                      <AlertDialogDescription>
                        Geben Sie "LÖSCHEN" ein, um Ihr Konto endgültig zu löschen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Input
                        placeholder="LÖSCHEN eingeben"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => {
                        setDeleteConfirmation('');
                        setShowSecondDialog(false);
                      }}>
                        Abbrechen
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== 'LÖSCHEN' || isDeleting}
                      >
                        {isDeleting ? 'Lösche...' : 'Endgültig löschen'}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cookies" className="mt-6">
            <CookieSettings />
          </TabsContent>

          <TabsContent value="ignored" className="mt-6">
            <IgnoredRecipesList />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;