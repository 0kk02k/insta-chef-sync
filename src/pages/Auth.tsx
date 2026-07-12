import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChefHat } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/Footer';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { validatePassword } from '@/utils/passwordValidation';
import { authRateLimiter, passwordResetRateLimiter } from '@/utils/rateLimiter';
import SEO from '@/components/SEO';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('de');
  const [measurementUnit, setMeasurementUnit] = useState('metric');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeError, setCodeError] = useState('');
  const { signUp, signIn, resetPassword, signInWithOAuth, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName || !invitationCode) {
      toast({
        title: "Fehler",
        description: "Bitte alle Felder ausfüllen (inkl. Einladungscode).",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Passwort zu schwach",
        description: "Bitte wähle ein stärkeres Passwort.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    const rateLimitKey = `signup_${email}`;
    if (!authRateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = authRateLimiter.getResetTime(rateLimitKey);
      const resetDate = resetTime ? new Date(resetTime) : new Date();
      toast({
        title: "Zu viele Versuche",
        description: `Bitte warte bis ${resetDate.toLocaleTimeString()} bevor du es erneut versuchst.`,
        variant: "destructive",
      });
      return;
    }

    // Validate invitation code
    setCodeValidating(true);
    setCodeError('');
    try {
      const response = await fetch(
        'https://fozagrcmptfnbnpivdnz.supabase.co/functions/v1/validate-registration-code',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: invitationCode.trim().toUpperCase() }),
        }
      );
      const result = await response.json();
      
      if (!result.valid) {
        setCodeError('Ungültiger Einladungscode');
        setCodeValidating(false);
        toast({
          title: "Ungültiger Code",
          description: "Der eingegebene Einladungscode ist nicht gültig.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      setCodeValidating(false);
      toast({
        title: "Fehler",
        description: "Code konnte nicht validiert werden.",
        variant: "destructive",
      });
      return;
    }
    setCodeValidating(false);

    setIsLoading(true);
    const { error, user: signedUpUser } = await signUp(email, password, {
      display_name: displayName,
      language,
      measurement_unit: measurementUnit
    });
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast({
          title: "Benutzer bereits registriert",
          description: "Diese E-Mail-Adresse ist bereits registriert. Bitte logge dich stattdessen ein.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registrierung fehlgeschlagen",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      if (signedUpUser?.id) {
        fetch(
          'https://fozagrcmptfnbnpivdnz.supabase.co/functions/v1/use-invitation-code',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: invitationCode.trim().toUpperCase(),
              userId: signedUpUser.id
            }),
          }
        ).catch(console.error);
      }
      
      // Reset rate limit on successful signup
      authRateLimiter.reset(rateLimitKey);
    }
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Fehler",
        description: "Bitte E-Mail und Passwort eingeben.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    const rateLimitKey = `signin_${email}`;
    if (!authRateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = authRateLimiter.getResetTime(rateLimitKey);
      const resetDate = resetTime ? new Date(resetTime) : new Date();
      toast({
        title: "Zu viele Versuche",
        description: `Bitte warte bis ${resetDate.toLocaleTimeString()} bevor du es erneut versuchst.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      // Handle various Supabase auth error messages
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('Email not confirmed') ||
          error.message.includes('Invalid email or password') ||
          error.message.toLowerCase().includes('invalid') ||
          error.message.toLowerCase().includes('not found')) {
        toast({
          title: "Anmeldung fehlgeschlagen",
          description: "E-Mail oder Passwort ungültig. Überprüfe deine Eingaben oder nutze 'Passwort vergessen?'",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Anmeldung fehlgeschlagen",
          description: `Fehler: ${error.message}`,
          variant: "destructive",
        });
      }
    } else {
      // Reset rate limit on successful signin
      authRateLimiter.reset(rateLimitKey);
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Fehler",
        description: "Bitte E-Mail-Adresse eingeben.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit for password reset
    const rateLimitKey = `reset_${email}`;
    if (!passwordResetRateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = passwordResetRateLimiter.getResetTime(rateLimitKey);
      const resetDate = resetTime ? new Date(resetTime) : new Date();
      toast({
        title: "Zu viele Versuche",
        description: `Bitte warte bis ${resetDate.toLocaleTimeString()} bevor du es erneut versuchst.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(email);
    
    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "E-Mail gesendet",
        description: "Überprüfe deine E-Mails für den Passwort-Reset-Link.",
      });
      setShowResetPassword(false);
      // Reset rate limit on successful password reset request
      passwordResetRateLimiter.reset(rateLimitKey);
    }
    setIsLoading(false);
  };

  const handleOAuthSignIn = async (provider: 'google') => {
    setIsLoading(true);
    const { error } = await signInWithOAuth(provider);
    
    if (error) {
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <SEO 
        title="Anmelden"
        description="Melde dich bei CookingCompiler an oder erstelle ein neues Konto, um deine Rezeptsammlung zu verwalten."
        url="/auth"
      />
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-full p-3">
              <ChefHat className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">CookingCompiler</CardTitle>
          <CardDescription>
            Sammle und organisiere deine Rezepte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-Mail</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Passwort</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Anmelden
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Oder anmelden mit
                    </span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <div className="text-center mt-4">
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="text-sm"
                  >
                    Passwort vergessen?
                  </Button>
                </div>
                {showResetPassword && (
                  <form onSubmit={handleResetPassword} className="mt-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">E-Mail für Passwort-Reset</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Deine E-Mail-Adresse"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading} size="sm">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Passwort-Reset senden
                      </Button>
                    </div>
                  </form>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-code">Einladungscode *</Label>
                  <Input
                    id="signup-code"
                    type="text"
                    value={invitationCode}
                    onChange={(e) => {
                      setInvitationCode(e.target.value.toUpperCase());
                      setCodeError('');
                    }}
                    placeholder="z.B. COOKINGCOMPILER2026"
                    required
                    className={`font-mono ${codeError ? 'border-destructive' : ''}`}
                  />
                  {codeError && (
                    <p className="text-sm text-destructive">{codeError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Du benötigst einen Einladungscode um dich zu registrieren.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Dein vollständiger Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-Mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Passwort</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <PasswordStrengthIndicator password={password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-language">Sprache</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sprache wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-measurement">Maßeinheiten</Label>
                  <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Maßeinheiten wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metrisch (g, kg, ml, l)</SelectItem>
                      <SelectItem value="imperial">Imperial (oz, lb, fl oz, cups)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || codeValidating}>
                  {(isLoading || codeValidating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {codeValidating ? 'Code wird geprüft...' : 'Registrieren'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Oder registrieren mit
                    </span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
