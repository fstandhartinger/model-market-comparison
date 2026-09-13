# RelayModels im Benchmark-Heaven-Workstream — verbindliche Regel

**Quelle:** Florian, 13.09.2026 22:21 UTC, Telegram-Kanal Hermes.
**Nachgetragen:** 14.09.2026 von Claude Code (Laptop-Session). Ein frueherer
Eintrag behauptete faelschlich, diese Datei existiere bereits — sie fehlte.
Hermes hat den Fehler am 13.09. 22:08 in `fuer-claude.md` aufgedeckt. Korrekt ist
der Stand ab hier.

## Was RelayModels ist

Ein sehr billiger Anbieter (`https://api.relaymodels.com/v1`), ueber den **alle**
Modelle erreichbar sind, auch die teuren Spitzenmodelle (Fable 5.1, GPT-6 Astra).
Aufruf ueber den Wrapper `/home/flori/bin/opencode-relaymodels`. Der Schluessel
steht ausschliesslich in der Wrapper-/Provider-Konfiguration als
`{env:RELAYMODELS_API_KEY}` — **nie** im Klartext in Prompts, Dateien oder Commits.

## Die harte Regel — keine Geheimnisse in Prompts

Florian woertlich:

> "hier haben wir etwas bedenken, ob der Provider unsere Prompts mitliest, daher
> ist uns hier wichtig, dass wir keine Env Vars oder Secrets oder Passwoerter oder
> API Key values mitsenden in den promtps"

Daraus folgt fuer jeden Lauf ueber RelayModels:

- **Nie** Umgebungsvariablen, Secrets, Passwoerter, API-Key-Werte, Cookies,
  Session-Token oder Kundendaten in den Prompt geben — auch nicht als Beispiel,
  auch nicht maskiert.
- **Keine** Dateien anhaengen oder einlesen lassen, die solche Werte enthalten
  (`.env`, `dev-secrets.env`, `.secrets.env`, `auth.json`, Backups davon).
- Wer unsicher ist, ob ein Ausschnitt etwas Vertrauliches enthaelt: nicht ueber
  RelayModels schicken, sondern ueber Chutes (Kimi K3 / DeepSeek-V4-Flash /
  Qwen3.8-27B) oder ein Premium-Modell.

## Wo RelayModels eingesetzt werden soll

Florian woertlich:

> "ich moechte OpenCoder mit Modellen von diesem Provider gerne im Einsatz haben
> fuer den German Solopreneurs Auftrag ... und fuer die Arbeit an Benchmark Heaven"

Also genau zwei Einsatzorte, beide **Open Source bzw. ohne Geheimnisse**:

1. **German Solopreneurs** (`/home/flori/x-german-solopreneurs/`)
2. **Benchmark Heaven** — dieser Workstream

Fuer alles andere gilt die normale Modell-Oekonomie
(`/home/flori/.hermes/model-economy-policy.md`): Grossteil der Fliessarbeit auf
kostenlose Chutes-Modelle, Superhirne (Fable 5.1, GPT-6 Astra) nur punktuell.

## Warum das fuer Benchmark Heaven unbedenklich ist

Benchmark Heaven arbeitet auf oeffentlichen Benchmark- und Preisdaten und auf
Code, der ohnehin offengelegt wird. Es gibt hier keine Kundendaten und keine
Zugangsdaten im Arbeitsmaterial — deshalb hat Florian gerade diesen Workstream
fuer den guenstigen Anbieter freigegeben. Diese Unbedenklichkeit ist eine
Eigenschaft des Materials, nicht des Anbieters: sobald ein Auftrag Geheimnisse
beruehrt, faellt er aus RelayModels heraus.
