import React, { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import { CookieBanner } from "@/components/CookieBanner";
import { Loader2 } from "lucide-react";

// Light pages - direct import
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

// Heavy pages - lazy loaded
const Index = lazy(() => import("./pages/Index"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const ShoppingLists = lazy(() => import("./pages/ShoppingLists"));
const ShoppingListDetail = lazy(() => import("./pages/ShoppingListDetail"));
const Admin = lazy(() => import("./pages/Admin"));

// Loading component for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Seite wird geladen...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <CookieConsentProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/recipe/:id" element={<RecipeDetail />} />
                    <Route path="/shopping-lists" element={<ShoppingLists />} />
                    <Route path="/shopping-lists/:id" element={<ShoppingListDetail />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/impressum" element={<Impressum />} />
                    <Route path="/datenschutz" element={<Datenschutz />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <CookieBanner />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </CookieConsentProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
