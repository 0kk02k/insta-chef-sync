import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-warm/5 via-purple-soft/5 to-pink-vibrant/5 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">404</h1>
          <p className="text-xl text-muted-foreground mb-6">Oops! Diese Seite wurde nicht gefunden</p>
          <Button asChild className="bg-white text-primary border border-primary hover:bg-white hover:text-primary">
            <Link to="/">
              Zurück zur Startseite
            </Link>
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
