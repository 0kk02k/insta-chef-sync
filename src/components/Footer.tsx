import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="mt-auto py-4 border-t border-border/30" style={{ backgroundColor: 'hsl(var(--accent-2))' }}>
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center space-x-8">
          <Link 
            to="/impressum" 
            className="transition-colors text-sm hover:opacity-80"
            style={{ color: 'hsl(var(--primary))' }}
          >
            Impressum
          </Link>
          <div className="w-px h-4" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
          <Link 
            to="/datenschutz" 
            className="transition-colors text-sm hover:opacity-80"
            style={{ color: 'hsl(var(--primary))' }}
          >
            Datenschutz
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;