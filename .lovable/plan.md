
# Admin-Dashboard mit Rollenbasiertem Zugriffssystem

## Übersicht
Implementierung einer sicheren Admin-Seite mit rollenbasierter Zugriffskontrolle. Das Zahnrad-Icon erscheint nur für Benutzer mit Admin-Rolle. Die Seite ermöglicht:
1. Bearbeitung von AI-Prompts (für alle Edge Functions)
2. Benutzerverwaltung mit Aktivitätsübersicht

---

## 1. Datenbank-Änderungen

### 1.1 User Roles Tabelle erstellen
```sql
-- Enum für Rollen
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Rollen-Tabelle
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- RLS aktivieren
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 1.2 Security Definer Funktion (verhindert Rekursion)
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### 1.3 RLS Policies für user_roles
```sql
-- Nur Admins können Rollen sehen
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Nur Admins können Rollen vergeben
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

### 1.4 AI Prompts Tabelle erstellen
```sql
CREATE TABLE public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  prompt_template text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- RLS: Nur Admins können lesen/schreiben
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prompts" ON public.ai_prompts
FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

### 1.5 Initial-Admin setzen
```sql
-- Admin-Rolle für okko.prothmann@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users 
WHERE email = 'okko.prothmann@gmail.com';
```

---

## 2. Frontend-Komponenten

### 2.1 Admin-Hook erstellen
**Datei:** `src/hooks/useAdminRole.tsx`
- Prüft ob aktueller User Admin-Rolle hat
- Cached das Ergebnis für Performance

### 2.2 Admin-Seite erstellen
**Datei:** `src/pages/Admin.tsx`

**Tabs:**
1. **AI-Prompts** - Bearbeitung der System-Prompts für alle Edge Functions
2. **Benutzer** - Übersicht aller Profile mit Aktivitätsdaten

**Features:**
- Prompt-Editor mit Syntax-Highlighting für jede Edge Function
- Benutzer-Tabelle mit: Name, E-Mail, Registrierungsdatum, Rezeptanzahl, letzte Aktivität
- Rollen-Vergabe (Admin/User) für einzelne Benutzer

### 2.3 Admin-Button im Header (Index.tsx)
- Zahnrad-Icon neben den anderen Header-Buttons
- Nur sichtbar wenn `isAdmin === true`
- Führt zu `/admin`

### 2.4 Route hinzufügen (App.tsx)
```tsx
<Route path="/admin" element={<Admin />} />
```

---

## 3. Edge Function Updates

### 3.1 Neue Edge Function: `admin-get-users`
- Holt alle Profile mit Rezept-Statistiken
- Nur für Admins zugänglich (Rollenprüfung)

### 3.2 Prompt-Loading in bestehenden Functions
Die Edge Functions werden angepasst, um Prompts aus der `ai_prompts`-Tabelle zu laden (mit Fallback auf hardcodierte Prompts).

---

## 4. Architektur-Diagramm

```text
+-------------------+
|    Index.tsx      |
|  (Zahnrad-Icon)   |---> nur wenn isAdmin
+--------+----------+
         |
         v
+-------------------+
|    Admin.tsx      |
|  - AI Prompts Tab |
|  - Users Tab      |
+--------+----------+
         |
         v
+-------------------+     +------------------+
| user_roles Table  |<--->| has_role() Func  |
| (RLS geschützt)   |     | (Security Def.)  |
+-------------------+     +------------------+
         |
         v
+-------------------+
|   ai_prompts      |
|   (editierbar)    |
+-------------------+
```

---

## 5. Technische Details

### AI-Prompts die bearbeitbar werden:

| Function Name | Beschreibung |
|---------------|--------------|
| `process-instagram-recipe` | Rezept-Extraktion aus Text/URL |
| `process-screenshot-recipe` | Rezept-Extraktion aus Screenshots |
| `pdf-processor` | Rezept-Extraktion aus PDFs |
| `generate-recipe-image` | FLUX.schnell Bildgenerierung |
| `generate-recipe-image-kie` | KiE.ai SeaDream Bildgenerierung |
| `restructure-ingredients` | Zutaten-Strukturierung |
| `normalize-ingredients` | Zutaten-Normalisierung |

### Benutzeraktivitäts-Daten:
- Anzahl Rezepte (gesamt / veröffentlicht)
- Registrierungsdatum
- Letzte Aktivität (basierend auf letztem Rezept-Update)

---

## Sicherheitsaspekte
- Rollenprüfung erfolgt serverseitig über RLS und `has_role()` Funktion
- Keine E-Mail-Adressen im Client-Code hardcodiert
- Security Definer Function verhindert RLS-Rekursion
- Edge Functions validieren Admin-Rolle vor Datenzugriff
