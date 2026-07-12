import React from 'react';
import { ChefHat, User, LogOut, Settings, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SteamEffect } from '@/components/SteamEffect';

interface TransitionHeaderProps {
  atTop: boolean;
  user: any;
  isAdmin: boolean;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

export const TransitionHeader: React.FC<TransitionHeaderProps> = ({
  atTop,
  user,
  isAdmin,
  onSignOut,
  onNavigate
}) => {
  return (
    <div className="header-wrapper relative">
      {/* HERO HEADER */}
      <header
        className={`header hero-header absolute inset-0 transition-opacity duration-500 ${
          atTop ? 'opacity-100 z-10' : 'opacity-0 z-0'
        }`}
      >
        <SteamEffect />

        {/* Auth Buttons - Oben rechts */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <>
              {isAdmin && (
                <Button
                  onClick={() => onNavigate('/admin')}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                  title="Admin"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={() => onNavigate('/shopping-lists')}
                variant="outline"
                size="sm"
                className="h-9 px-3 bg-white/10 hover:bg:white/20 text-white border-white/20 backdrop-blur-sm"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
              <Button
                onClick={onSignOut}
                size="sm"
                className="h-9 px-4 bg-white text-brand hover:bg:white/90"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onNavigate('/auth')}
              size="sm"
              className="h-9 px-4 bg-white text-brand hover:bg:white/90"
            >
              <User className="h-4 w-4" />
              <span className="font-medium">Login</span>
            </Button>
          )}
        </div>

        {/* Zentrierte Content */}
        <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-xl border border-black/5 mb-4">
              <ChefHat className="h-16 w-16 sm:h-24 sm:w-24" style={{ color: '#FF7A3D' }} />
            </div>
            <div className="space-y-2">
              <h1 className="brand text-5xl sm:text-7xl font-bold tracking-tight">
                CookingCompiler
              </h1>
              <p className="text-base sm:text-lg text-white/90">KI-gestützte Rezepteverwaltung</p>
            </div>
          </div>
        </div>
      </header>

      {/* COMPACT HEADER */}
      <header
        className={`header compact-header sticky top-0 z-40 shadow-md transition-opacity duration-500 ${
          !atTop ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                <ChefHat className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#FF7A3D' }} />
              </div>
              <div className="leading-tight">
                <h1 className="brand text-xl sm:text-2xl font-bold leading-none">
                  CookingCompiler
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  {isAdmin && (
                    <Button
                      onClick={() => onNavigate('/admin')}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 bg-white/10 hover:bg:white/20 text-white border-white/20"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => onNavigate('/shopping-lists')}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 bg-white/10 hover:bg:white/20 text-white border-white/20"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={onSignOut}
                    size="sm"
                    className="h-8 px-3 bg-white text-brand hover:bg:white/90"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => onNavigate('/auth')}
                  size="sm"
                  className="h-8 px-3 bg-white text-brand hover:bg:white/90"
                >
                  <User className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
