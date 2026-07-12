# Agent Directives

## 1. Execution Principles
- **Think Before Coding:** Kläre Unklarheiten und nenne Annahmen, bevor du implementierst.
- **Simplicity First:** Kein Overengineering, keine vorzeitigen Abstraktionen. Minimaler Code, maximale Wirkung.
- **Surgical Changes:** Verändere ausschließlich Code, der für das Ziel zwingend notwendig ist. Matche den exakten bestehenden Stil.
- **Goal-Driven:** Eine Aufgabe ist erst abgeschlossen, wenn sie durch Tests oder erfolgreiche Ausführung verifiziert wurde.

## 2. Project Standards
- **Tech Stack & Libraries:** Nutze konsequent vorhandene Utilities und UI-Bibliotheken. Keine Custom-Lösungen, wenn die Library es hergibt.
- **Documentation:** Aktualisiere relevante `.md`-Dokumente synchron zu jeder architektonischen Änderung.
- **Push Back:** Wenn ein User-Request unnötig komplex ist, schlage proaktiv die simplere Lösung vor.

## 3. Skill Loading
Skill-Registry: `/home/okko/ki/skills/README.md`

Wenn du eine neue Aufgabe beginnst:
1. Lies die Skill-Registry **einmal**.
2. Lade die 2-3 relevantesten Skills für die aktuelle Aufgabe.
3. Nicht bei jedem Zwischenschritt neu laden – nur bei Aufgabenwechsel.

## 4. Project Initialization
Beim ersten Kontakt mit einem neuen Projekt:
1. Lies die Projektstruktur und identifiziere Tech Stack, Frameworks und bestehende Konventionen.
2. Prüfe ob eine projektspezifische `agent.md` (oder `.claude/.cursorrules`) existiert.
3. Wenn keine existiert und das Projekt klar ist: Schlage dem User eine projektspezifische `agent.md` vor, die Library-Versionen, Test-Framework, Linter-Regeln und Architektur-Konventionen dokumentiert.
4. Die projektspezifische Datei enthält nur **harte Fakten** – keine Verhaltensregeln (die stehen hier).

## 5. Verfügbare Werkzeuge
**z.ai MCP-Server** sind in `~/.claude.json` (Sektion `mcpServers`) konfiguriert. Grundsätzlich **nativ** nutzen, wenn das ausführende Coding-Tool MCP selbst spricht (z. B. Claude Code, Cline, OpenCode).

Die CLI-Bridge `~/.local/bin/zai-mcp` ist ein **Fallback ausschließlich für vix** und greift nur, wenn das Tool MCP nicht nativ unterstützt. Sie liest Server und API-Key automatisch aus `~/.claude.json`.
```
zai-mcp servers                       # Server + Transport auflisten
zai-mcp tools <server>                # Werkzeuge eines Servers
zai-mcp call <server> <tool> '<json>' # Werkzeug aufrufen
zai-mcp <server> <tool> '<json>'      # Kurzform für call
```
Server & Status (Stand 2026-06-16):
- `zai-mcp-server` (stdio, GLM-4.6V Vision) – **funktioniert**, eigenes Kontingent. Bild-/Screenshot-/Video-Analyse: `analyze_image`, `ui_to_artifact`, `extract_text_from_screenshot`, `understand_technical_diagram`, `analyze_data_visualization`, `ui_diff_check`, `analyze_video`. Bilddatei braucht korrekte Endung (`.jpg`/`.png`).
- `web-search-prime` (Web-Suche), `web-reader` (URL→Markdown), `zread` (GitHub-Repos) (http) – **funktionieren**. Die Brücke führt den MCP-Session-Handshake (`initialize` → Session → `call`) aus; ohne ihn liefern die Server `-401`/`-500`/"fetch failed". Gemeinsames GLM-Coding-Plan-Kontingent; bei echtem `-429` ist das Kontingent erschöpft (`https://z.ai/manage-apikey/apikey-list`).
  - **Wichtig (Compliance):** Der GLM-Coding-Plan ist auf *offiziell unterstützte Tools* beschränkt (Claude Code, Cline, …). z.ai direkt aus vix heraus verstößt gegen die Usage Policy (Risiko: Drosselung/Bann). z.ai-Suche aus vix deshalb **nur konform über Claude Code** (siehe `vix-search` Provider `claude-zai`).

**vix-search** (`~/.local/bin/vix-search`) – steckbare Web-Such-CLI für vix. Provider: `duckduckgo` (Default, kein Key), `claude-zai` (z.ai-Suche **konform** via Claude Code, kein Extra-Key), `brave`/`tavily`/`serper` (Key nötig), `searxng` (Instanz). Config: `~/.config/vix-search/config.json` (Keys/Env-Vars: `BRAVE_API_KEY`/`TAVILY_API_KEY`/`SERPER_API_KEY`/`SEARXNG_URL`).
```
vix-search "<query>"                 # Default-Provider
vix-search -p claude-zai "<query>"   # z.ai, konform über Claude Code
vix-search -p duckduckgo "<query>"   # schnell, gratis, kein Key
vix-search providers                 # Verfügbarkeit der Provider
```
