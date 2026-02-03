import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, Copy, RefreshCw, Key, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface InvitationCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

interface AppSetting {
  id: string;
  key: string;
  value: string | null;
}

const InvitationCodesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const [globalCode, setGlobalCode] = useState('');
  const [globalCodeLoading, setGlobalCodeLoading] = useState(true);
  const [savingGlobalCode, setSavingGlobalCode] = useState(false);

  const [newCodeExpiry, setNewCodeExpiry] = useState('');

  // Fetch invitation codes
  const fetchCodes = async () => {
    setCodesLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast({
        title: "Fehler",
        description: "Einladungscodes konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setCodesLoading(false);
    }
  };

  // Fetch global registration code
  const fetchGlobalCode = async () => {
    setGlobalCodeLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'global_registration_code')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setGlobalCode(data?.value || '');
    } catch (error) {
      console.error('Error fetching global code:', error);
    } finally {
      setGlobalCodeLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
    fetchGlobalCode();
  }, []);

  // Generate random code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create new invitation code
  const createCode = async () => {
    setGenerating(true);
    try {
      const newCode = generateRandomCode();
      const expiresAt = newCodeExpiry ? new Date(newCodeExpiry).toISOString() : null;

      const { error } = await supabase
        .from('invitation_codes')
        .insert({
          code: newCode,
          created_by: user?.id,
          expires_at: expiresAt,
        });

      if (error) throw error;

      await fetchCodes();
      setNewCodeExpiry('');

      toast({
        title: "Code erstellt",
        description: `Neuer Code: ${newCode}`,
      });
    } catch (error: any) {
      console.error('Error creating code:', error);
      toast({
        title: "Fehler",
        description: error.message || "Code konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Delete code
  const deleteCode = async (id: string) => {
    setDeletingCode(id);
    try {
      const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCodes(codes.filter(c => c.id !== id));
      toast({
        title: "Gelöscht",
        description: "Einladungscode wurde gelöscht.",
      });
    } catch (error) {
      console.error('Error deleting code:', error);
      toast({
        title: "Fehler",
        description: "Code konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setDeletingCode(null);
    }
  };

  // Copy code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Kopiert",
      description: "Code wurde in die Zwischenablage kopiert.",
    });
  };

  // Save global code
  const saveGlobalCode = async () => {
    setSavingGlobalCode(true);
    try {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', 'global_registration_code')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: globalCode, updated_by: user?.id })
          .eq('key', 'global_registration_code');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({
            key: 'global_registration_code',
            value: globalCode,
            updated_by: user?.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Gespeichert",
        description: "Globaler Registrierungscode wurde aktualisiert.",
      });
    } catch (error) {
      console.error('Error saving global code:', error);
      toast({
        title: "Fehler",
        description: "Code konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSavingGlobalCode(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Global Registration Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Globaler Registrierungscode
          </CardTitle>
          <CardDescription>
            Dieser Code kann von allen neuen Benutzern verwendet werden, um sich zu registrieren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {globalCodeLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="global-code">Code</Label>
                <Input
                  id="global-code"
                  value={globalCode}
                  onChange={(e) => setGlobalCode(e.target.value.toUpperCase())}
                  placeholder="z.B. COOKINGCOMPILER2026"
                  className="font-mono"
                />
              </div>
              <Button
                onClick={saveGlobalCode}
                disabled={savingGlobalCode}
              >
                {savingGlobalCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Speichern"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => copyCode(globalCode)}
                disabled={!globalCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitation Codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Einmal-Einladungscodes
              </CardTitle>
              <CardDescription>
                Diese Codes können jeweils nur einmal verwendet werden.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCodes}
              disabled={codesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${codesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create new code */}
          <div className="flex items-end gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex-1 space-y-2">
              <Label htmlFor="expiry">Ablaufdatum (optional)</Label>
              <Input
                id="expiry"
                type="datetime-local"
                value={newCodeExpiry}
                onChange={(e) => setNewCodeExpiry(e.target.value)}
              />
            </div>
            <Button onClick={createCode} disabled={generating} className="gap-2">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Code generieren
            </Button>
          </div>

          {/* Codes table */}
          {codesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Einladungscodes vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Ablaufdatum</TableHead>
                    <TableHead>Verwendet am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">
                        {code.code}
                      </TableCell>
                      <TableCell>
                        {code.used_by ? (
                          <Badge variant="secondary">Verwendet</Badge>
                        ) : isExpired(code.expires_at) ? (
                          <Badge variant="destructive">Abgelaufen</Badge>
                        ) : code.is_active ? (
                          <Badge variant="default">Aktiv</Badge>
                        ) : (
                          <Badge variant="outline">Inaktiv</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(code.created_at)}</TableCell>
                      <TableCell>{formatDate(code.expires_at)}</TableCell>
                      <TableCell>{formatDate(code.used_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(code.code)}
                            title="Kopieren"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCode(code.id)}
                            disabled={deletingCode === code.id}
                            title="Löschen"
                          >
                            {deletingCode === code.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationCodesTab;
