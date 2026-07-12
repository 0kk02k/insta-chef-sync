# Hero-Segment Verbesserungen - Design Alternativen

## Option A+B: Floating Kitchenware + Mouse-Parallax (CSS-only)

**Beschreibung:**
- 2-3 Küchen-Icons (Töpfe, Pfannen) die sanft schweben
- Elemente folgen der Mausbewegung (Parallax-Effekt)
- Keine externe Library nötig

**Aufwand:** ~2-3 Stunden
**Bundle-Größe:** +0 KB (CSS-only)
**Performance:** Hoch (GPU-beschleunigt)

**Implementierung:**
- CSS `@keyframes` für schwebende Animation
- JavaScript `mousemove` Event für Parallax
- `transform: translate3d()` für Smoothness

## Option C: Animated Recipe Pattern

**Beschreibung:**
- Subtile Hintergrund-Pattern-Animation
- Rezept-Icons/Ingrediente die im Hintergrund wandern
- Sehr dezent, keine Ablenkung

**Aufwand:** ~1 Stunde
**Bundle-Größe:** +0 KB

## Option D: Interactive Steam/Dampf (AKTIV)

**Beschreibung:**
- Realistische Dampf-Animation über dem Logo/Header
- Interaktiv: Dampf reagiert auf Mausbewegung
- Atmosphärisch, passt zum Koch-Theme

**Aufwand:** ~4-6 Stunden
**Technik:** Canvas oder CSS Partikel
