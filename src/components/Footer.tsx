import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border/50 py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center space-x-8">
          <Link 
            to="/impressum" 
            className="text-muted-foreground hover:text-primary transition-colors text-sm"
          >
            Impressum
          </Link>
          <div className="w-px h-4 bg-border"></div>
          <Link 
            to="/datenschutz" 
            className="text-muted-foreground hover:text-primary transition-colors text-sm"
          >
            Datenschutz
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;