import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ChefHat, LogOut, Loader2 } from 'lucide-react';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-primary rounded-full p-2">
              <ChefHat className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">InstaChef</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Willkommen, {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Willkommen bei InstaChef!</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Sammeln und organisieren Sie Ihre Instagram-Rezepte in einem einheitlichen Format.
          </p>
          
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg p-8">
            <h3 className="text-2xl font-semibold mb-4">Ihre Rezeptsammlung</h3>
            <p className="text-muted-foreground mb-6">
              Hier werden Ihre gespeicherten Rezepte angezeigt. 
              Fügen Sie Instagram-Rezepte hinzu, um loszulegen.
            </p>
            <Button size="lg">
              Erstes Rezept hinzufügen
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
