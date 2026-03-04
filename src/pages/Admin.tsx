import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Loader2, RefreshCw, Shield, ShieldCheck, Bot, Users, Key } from 'lucide-react';
import InvitationCodesTab from '@/components/admin/InvitationCodesTab';
import SEO from '@/components/SEO';

interface AIPrompt {
  id: string;
  function_name: string;
  prompt_template: string;
  description: string | null;
  updated_at: string;
}

interface UserWithStats {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  recipe_count: number;
  published_count: number;
  last_activity: string | null;
  role: 'admin' | 'user';
}

interface AIServiceGroup {
  name: string;
  host: string;
  apiKeyEnv: string;
  functions: Record<string, { template: string; description: string }>;
}

const AI_SERVICE_GROUPS: AIServiceGroup[] = [
  {
    name: 'xAI Grok',
    host: 'api.x.ai',
    apiKeyEnv: 'XAI_API_KEY',
    functions: {
      'process-instagram-recipe': {
        template: `Du bist ein Experte für Rezept-Extraktion. Analysiere den folgenden Text/URL und extrahiere ein strukturiertes Rezept.

Antworte NUR mit gültigem JSON im folgenden Format:
{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": ["Zutat 1", "Zutat 2"],
  "instructions": ["Schritt 1", "Schritt 2"],
  "cooking_time": 30,
  "servings": 4,
  "tags": ["Tag1", "Tag2"]
}`,
        description: 'Extrahiert Rezepte aus Instagram-Posts oder URLs'
      },
      'process-screenshot-recipe': {
        template: `Analysiere dieses Bild eines Rezepts und extrahiere alle Informationen.

Antworte NUR mit gültigem JSON im folgenden Format:
{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": ["Zutat 1", "Zutat 2"],
  "instructions": ["Schritt 1", "Schritt 2"],
  "cooking_time": 30,
  "servings": 4,
  "tags": ["Tag1", "Tag2"]
}`,
        description: 'Extrahiert Rezepte aus Screenshots'
      },
      'pdf-processor': {
        template: `Analysiere den folgenden PDF-Text und extrahiere das Rezept.

Antworte NUR mit gültigem JSON im folgenden Format:
{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": ["Zutat 1", "Zutat 2"],
  "instructions": ["Schritt 1", "Schritt 2"],
  "cooking_time": 30,
  "servings": 4,
  "tags": ["Tag1", "Tag2"]
}`,
        description: 'Extrahiert Rezepte aus PDF-Dokumenten'
      },
      'restructure-ingredients': {
        template: `Analysiere die folgende Zutatenliste und strukturiere sie.

Jedes Element: {"amount": number|null, "unit": string|null, "ingredient": string}

Beispiele: "200g Mehl" → {"amount":200,"unit":"g","ingredient":"Mehl"}`,
        description: 'Strukturiert Zutatenlisten in Menge/Einheit/Zutat'
      },
      'normalize-ingredients': {
        template: `Analysiere diese Zutatenliste und führe ähnliche Zutaten zusammen.

Erkenne Zutaten, die dasselbe Lebensmittel bezeichnen (z.B. "Tomate", "Tomaten", "tomate").
Konvertiere Einheiten und addiere Mengen.`,
        description: 'Normalisiert und fasst Zutaten zusammen'
      }
    }
  },
  {
    name: 'Together AI (FLUX.schnell)',
    host: 'api.together.xyz',
    apiKeyEnv: 'TOGETHER_API_KEY',
    functions: {
      'generate-recipe-image': {
        template: `Create a professional food photography image for the recipe: {title}

Style: Appetizing, well-lit, professional food photography
Setting: Clean, modern kitchen or dining setting
Focus: The prepared dish should be the main subject`,
        description: 'Generiert Rezeptbilder mit FLUX.schnell'
      }
    }
  },
  {
    name: 'KiE.ai (SeaDream)',
    host: 'api.kie.ai',
    apiKeyEnv: 'KIE_AI_API_KEY',
    functions: {
      'generate-recipe-image-kie': {
        template: `Create a beautiful food photograph of: {title}

High-quality food photography, appetizing presentation, professional lighting`,
        description: 'Generiert Rezeptbilder mit KiE.ai SeaDream'
      }
    }
  }
];

// Flatten for backward compat
const DEFAULT_PROMPTS: Record<string, { template: string; description: string }> = {};
AI_SERVICE_GROUPS.forEach(g => {
  Object.entries(g.functions).forEach(([k, v]) => { DEFAULT_PROMPTS[k] = v; });
});

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);

  // Editable service config (host + apiKeyEnv per group)
  const [serviceConfig, setServiceConfig] = useState<Record<string, { host: string; apiKeyEnv: string }>>({});
  const [editedConfig, setEditedConfig] = useState<Record<string, { host?: string; apiKeyEnv?: string }>>({});
  const [savingConfig, setSavingConfig] = useState<string | null>(null);

  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      toast({
        title: "Zugriff verweigert",
        description: "Du hast keine Admin-Berechtigung.",
        variant: "destructive",
      });
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  // Fetch AI prompts + service config
  useEffect(() => {
    const fetchPromptsAndConfig = async () => {
      if (!isAdmin) return;
      
      try {
        const [promptsRes, settingsRes] = await Promise.all([
          supabase.from('ai_prompts').select('*').order('function_name'),
          supabase.from('app_settings').select('*').in('key', 
            AI_SERVICE_GROUPS.flatMap(g => [`ai_host_${g.name}`, `ai_apikey_${g.name}`])
          )
        ]);

        if (promptsRes.error) throw promptsRes.error;
        setPrompts(promptsRes.data || []);

        // Build service config from saved settings
        const settings = settingsRes.data || [];
        const config: Record<string, { host: string; apiKeyEnv: string }> = {};
        AI_SERVICE_GROUPS.forEach(g => {
          const savedHost = settings.find(s => s.key === `ai_host_${g.name}`)?.value;
          const savedKey = settings.find(s => s.key === `ai_apikey_${g.name}`)?.value;
          config[g.name] = {
            host: savedHost || g.host,
            apiKeyEnv: savedKey || g.apiKeyEnv,
          };
        });
        setServiceConfig(config);
      } catch (error) {
        console.error('Error fetching prompts:', error);
      } finally {
        setPromptsLoading(false);
      }
    };

    if (isAdmin) {
      fetchPromptsAndConfig();
    }
  }, [isAdmin]);

  // Fetch users with stats
  const fetchUsers = async () => {
    if (!isAdmin) return;
    
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      
      if (error) throw error;
      setUsers(data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handlePromptChange = (functionName: string, value: string) => {
    setEditedPrompts(prev => ({ ...prev, [functionName]: value }));
  };

  const handleConfigChange = (groupName: string, field: 'host' | 'apiKeyEnv', value: string) => {
    setEditedConfig(prev => ({
      ...prev,
      [groupName]: { ...prev[groupName], [field]: value }
    }));
  };

  const getConfigValue = (groupName: string, field: 'host' | 'apiKeyEnv'): string => {
    return editedConfig[groupName]?.[field] ?? serviceConfig[groupName]?.[field] ?? 
      AI_SERVICE_GROUPS.find(g => g.name === groupName)?.[field] ?? '';
  };

  const hasConfigChanges = (groupName: string): boolean => {
    const edited = editedConfig[groupName];
    if (!edited) return false;
    const current = serviceConfig[groupName] || AI_SERVICE_GROUPS.find(g => g.name === groupName)!;
    return (edited.host !== undefined && edited.host !== current.host) || 
           (edited.apiKeyEnv !== undefined && edited.apiKeyEnv !== current.apiKeyEnv);
  };

  const saveServiceConfig = async (groupName: string) => {
    const edited = editedConfig[groupName];
    if (!edited) return;

    setSavingConfig(groupName);
    try {
      const current = serviceConfig[groupName] || AI_SERVICE_GROUPS.find(g => g.name === groupName)!;
      const upserts: { key: string; value: string; updated_by: string | undefined }[] = [];

      if (edited.host !== undefined && edited.host !== current.host) {
        upserts.push({ key: `ai_host_${groupName}`, value: edited.host, updated_by: user?.id });
      }
      if (edited.apiKeyEnv !== undefined && edited.apiKeyEnv !== current.apiKeyEnv) {
        upserts.push({ key: `ai_apikey_${groupName}`, value: edited.apiKeyEnv, updated_by: user?.id });
      }

      for (const item of upserts) {
        const { data: existing } = await supabase.from('app_settings').select('id').eq('key', item.key).single();
        if (existing) {
          await supabase.from('app_settings').update({ value: item.value, updated_by: item.updated_by }).eq('id', existing.id);
        } else {
          await supabase.from('app_settings').insert(item);
        }
      }

      // Update local state
      setServiceConfig(prev => ({
        ...prev,
        [groupName]: {
          host: edited.host ?? current.host,
          apiKeyEnv: edited.apiKeyEnv ?? current.apiKeyEnv,
        }
      }));
      setEditedConfig(prev => {
        const next = { ...prev };
        delete next[groupName];
        return next;
      });

      toast({ title: "Gespeichert", description: `Konfiguration für ${groupName} aktualisiert.` });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({ title: "Fehler", description: "Konfiguration konnte nicht gespeichert werden.", variant: "destructive" });
    } finally {
      setSavingConfig(null);
    }
  };

  const savePrompt = async (functionName: string) => {
    const template = editedPrompts[functionName];
    if (!template) return;

    setSavingPrompt(functionName);
    try {
      const existing = prompts.find(p => p.function_name === functionName);
      
      if (existing) {
        const { error } = await supabase
          .from('ai_prompts')
          .update({ 
            prompt_template: template,
            updated_by: user?.id 
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const defaultPrompt = DEFAULT_PROMPTS[functionName];
        const { error } = await supabase
          .from('ai_prompts')
          .insert({
            function_name: functionName,
            prompt_template: template,
            description: defaultPrompt?.description || null,
            updated_by: user?.id
          });

        if (error) throw error;
      }

      // Refresh prompts
      const { data } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('function_name');
      
      setPrompts(data || []);
      setEditedPrompts(prev => {
        const newState = { ...prev };
        delete newState[functionName];
        return newState;
      });

      toast({
        title: "Gespeichert",
        description: `Prompt für ${functionName} wurde aktualisiert.`,
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Fehler",
        description: "Prompt konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSavingPrompt(null);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    setUpdatingRole(userId);
    try {
      if (newRole === 'admin') {
        // Insert admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error && !error.message.includes('duplicate')) throw error;
      } else {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      }

      // Refresh users
      await fetchUsers();

      toast({
        title: "Rolle aktualisiert",
        description: `Benutzer ist jetzt ${newRole === 'admin' ? 'Admin' : 'User'}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Fehler",
        description: "Rolle konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const getPromptValue = (functionName: string): string => {
    if (editedPrompts[functionName] !== undefined) {
      return editedPrompts[functionName];
    }
    const saved = prompts.find(p => p.function_name === functionName);
    if (saved) {
      return saved.prompt_template;
    }
    return DEFAULT_PROMPTS[functionName]?.template || '';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Admin Dashboard"
        description="Administriere AI-Prompts und Benutzer"
        url="/admin"
      />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="prompts" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="prompts" className="gap-2">
              <Bot className="h-4 w-4" />
              AI-Prompts
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Benutzer
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-2">
              <Key className="h-4 w-4" />
              Einladungscodes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="space-y-6">
            {promptsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              AI_SERVICE_GROUPS.map((group) => (
                <Card key={group.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      {group.name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="font-mono text-xs">Host</Badge>
                        <span className="font-mono">{group.host}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="font-mono text-xs">API Key</Badge>
                        <span className="font-mono">{group.apiKeyEnv}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(group.functions).map(([functionName, { description }]) => (
                      <div key={functionName} className="space-y-2 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-sm">{functionName}</h3>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => savePrompt(functionName)}
                            disabled={savingPrompt === functionName || editedPrompts[functionName] === undefined}
                            className="gap-1"
                          >
                            {savingPrompt === functionName ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Speichern
                          </Button>
                        </div>
                        <Textarea
                          value={getPromptValue(functionName)}
                          onChange={(e) => handlePromptChange(functionName, e.target.value)}
                          className="font-mono text-xs min-h-[150px]"
                          placeholder="Prompt Template..."
                        />
                        {prompts.find(p => p.function_name === functionName) && (
                          <p className="text-xs text-muted-foreground">
                            Zuletzt aktualisiert: {formatDate(prompts.find(p => p.function_name === functionName)?.updated_at || null)}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Benutzerverwaltung</CardTitle>
                    <CardDescription>
                      Übersicht aller registrierten Benutzer mit Aktivitätsstatistiken.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsers}
                    disabled={usersLoading}
                    className="gap-1"
                  >
                    <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
                    Aktualisieren
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Keine Benutzer gefunden.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Benutzer</TableHead>
                          <TableHead>E-Mail</TableHead>
                          <TableHead>Registriert</TableHead>
                          <TableHead className="text-center">Rezepte</TableHead>
                          <TableHead className="text-center">Veröffentlicht</TableHead>
                          <TableHead>Letzte Aktivität</TableHead>
                          <TableHead>Rolle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell className="font-medium">
                              {userItem.display_name || 'Unbekannt'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {userItem.email}
                            </TableCell>
                            <TableCell>
                              {formatDate(userItem.created_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              {userItem.recipe_count}
                            </TableCell>
                            <TableCell className="text-center">
                              {userItem.published_count}
                            </TableCell>
                            <TableCell>
                              {formatDate(userItem.last_activity)}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={userItem.role}
                                onValueChange={(value: 'admin' | 'user') => 
                                  updateUserRole(userItem.id, value)
                                }
                                disabled={updatingRole === userItem.id || userItem.id === user?.id}
                              >
                                <SelectTrigger className="w-24">
                                  {updatingRole === userItem.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <SelectValue />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitation Codes Tab */}
          <TabsContent value="codes">
            <InvitationCodesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
