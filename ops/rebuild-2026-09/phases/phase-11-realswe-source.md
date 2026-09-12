# Phase 11 — Neue Quelle: Real-SWE (Specific Labs) vollständig einlesen

Florian (11.09.2026, 23:5x UTC): „new coding benchmark to add to benchmark heaven
https://realswe.withspecific.com/".

Diese Phase läuft nach Phase 09 und 10. Sie folgt demselben Vertrag wie jede andere
Quelle: `docs/benchmark-ingestion.md` (bindend), nicht eine vereinfachte Sonderbehandlung.

## Was die Quelle ist (am 11.09. abgerufen, im Lauf neu zu belegen)

- Kanonische URL: `https://withspecific.com/benchmarks/real-swe` (im Kopf der Seite als
  `rel="canonical"` ausgewiesen); `https://realswe.withspecific.com/` ist der von Florian
  genannte Zugang.
- Herausgeber: Specific Labs. Aufgabe: Coding-Agenten auf **privaten, lizenzierten
  Unternehmens-Codebasen**; Aufgaben stammen aus echten Firmenprojekten und sind im
  Internet nicht verfügbar.
- **Metrik: „Resolution rate" — ausdrücklich äquivalent zu pass@1, gemittelt über acht
  unabhängige Läufe je Aufgabe**, mit 95-%-Konfidenzintervall.
- Umfang der veröffentlichten Auswertung: **8 Modell-Harness-Konfigurationen × 10 Tasks ×
  8 Läufe = 640 bewertete Rollouts.** Diese Zahl gegen die eigenen Zählungen prüfen — sie
  ist der eingebaute Gegenbeweis für Extraktionsfehler.
- Bewertet werden **Modell UND Harness zusammen** (native Harnesse), z. B. GPT-6 Astra mit
  Codex CLI gegenüber GPT-6 Astra mit anderem Harness. Das ist für uns die wichtigste
  Modellierungsfrage dieser Phase.
- Zusätzlich veröffentlicht: geschätzte **Kosten je Rollout in USD**, Ausgabe-Tokens,
  Tool-Aufrufe, Wanduhr-Minuten je Task, Task-Ebene mit bestanden/8 je Modell, sowie eine
  Fehlerklassifikation (unverified assumption, missed requirement, integration error,
  regression, wrong file) je Modell.
- **Grenze der Quelle, die sichtbar bleiben muss:** Nur eine Stichprobe von 10 Tasks ist
  öffentlich auswertbar; weitere Tasks gibt es nur auf Anfrage. Die veröffentlichten
  Modellwerte sind die Kopfzeile der Quelle, die Task-Ebene ist die Stichprobe. Nichts
  davon darf als „alle Tasks" bezeichnet werden.

Vorab gelesene Kopfzeile (nur als Erwartungswert — im Lauf **gegen die hashgebundenen
Quellbytes neu ableiten**, nicht abschreiben):
Fable 5.1 · Claude Code 38,8 %; GPT-6 Astra · Codex CLI 33,8 %; Gemini 3.8 Flash ·
Gemini CLI 31,2 %; GLM 5.3 · Claude Code 28,8 %; Grok 4.6 · Grok Build 23,8 %;
Muse Spark 1.3 · Muse Code 23,8 %; Kimi K3 · Kimi Code 18,8 %; GPT-5.6 Sol · Codex CLI
16,2 %. Geschätzte Kosten je Rollout: 6,96 / 4,67 / 2,50 / 5,12 / 3,44 / 2,74 / 3,90 /
2,65 USD in derselben Reihenfolge.

## Auftrag

1. **Quelle unveränderlich erfassen.** HTML-Abruf mit URL, HTTP-Status, Abrufzeitpunkt,
   SHA-256 und Locator; Bytes in `data/raw/benchmarks/daily-evidence/<ISO-Zeitstempel>/`
   ablegen (Vorgabe aus `docs/benchmark-ingestion.md`). Keine Bewertung ohne Hash-Bindung.
2. **Registry-Eintrag** in `data/raw/benchmarks/registry.json` nach dem bestehenden Muster
   (siehe `aa-coding-agent-index::1.4` als Vorlage): `id: realswe::<datum-oder-version>`,
   `family: realswe`, `category: Coding`, `version_status`, ein Satz Beschreibung,
   `scoring` mit Metrik, **nativer Einheit** (die Quelle publiziert Prozent — also Prozent
   als native Einheit führen, nicht auf Bruch umrechnen) und Wertebereich, plus
   `evidence[]` mit URL, Datei, SHA-256, `fetched_at` und aussagekräftigem Auszug.
   Da die Quelle keine Versionsnummer nennt, ist die datierte Identität die richtige Form.
3. **Beobachtungen** je Konfiguration mit exakter Quellidentität, optionaler
   `model_id`-Zuordnung über den bestehenden Katalog, **Effort/Harness** (hier der
   Harness-Name), numerischem Wert in nativer Einheit, `protocol` (acht unabhängige Läufe
   je Task, pass@1-äquivalente Resolution rate, 95-%-KI), `basis`, HTTPS-Quell-URL,
   Publikations-/Abrufdatum sowie Datei-Hash und Locator.
   **Basis-Entscheidung begründen:** Specific Labs ist der durchführende Bewerter und
   nicht der Modellanbieter; nach dem Vertrag ist das `measured`. Wenn die Prüfung zu
   `self_reported` kommt, ist das nicht stillschweigend zu tun — dann greift die
   Eigentümer-Freigabe in `score-approvals.json` und der Punkt gehört als Blocker zu
   Florian.
   Das 95-%-KI gehört in die Beobachtung (unteres/oberes Ende), die Kosten je Rollout als
   eigener Wert mit eigener Einheit (USD) — nicht als heimliche Umrechnung in einen Score.
4. **Harness sauber modellieren.** Zwei Einträge desselben Modells mit verschiedenem
   Harness dürfen sich in der Oberfläche **nicht** zu einem Wert vermischen. Prüfe, ob das
   bestehende Schema (Effort/Harness an der Beobachtung) das trägt; wenn die Oberfläche
   heute nur je Modell einen Wert zeigt, ist das der eigentliche Arbeitsauftrag dieser
   Phase: Konfiguration sichtbar machen (Modell + Harness), Aggregat weiterhin ausweisbar.
5. **Task-Ebene und Fehlerklassifikation** als Sammlungen/Collections erfassen, soweit sie
   sauber belegbar sind (10 Tasks, bestanden/8 je Modell, Fehlerarten). Keine Zahl ohne
   Quelle; nicht Veröffentlichtes bleibt `unknown`, nicht geschätzt.
6. **Collector im Repo**, nach dem Muster der bestehenden Sammler: ein Skript, das aus den
   erfassten Bytes deterministisch die Beobachtungen erzeugt (kein Netz nötig für den
   Neuaufbau), mit Eintrag in `ingestion-lock.json` (Datei + SHA-256) und Prüfung der
   Quellbytes beim Aufbau — wie es der Vertrag für die anderen Quellen verlangt.
7. **Tests** (im bestehenden Testsatz, namentlich im Bericht genannt):
   - Extraktion aus einer kleinen, mitgelieferten Fixture: 8 Konfigurationen, 10 Tasks,
     8 Läufe ⇒ die 640-Rollout-Probe muss aufgehen.
   - Der Collector verweigert die Arbeit, wenn der Quell-Hash nicht zur Lock-Datei passt.
   - Eine Konfiguration mit unbekannter Modellidentität bleibt `model_id: null` und zählt
     **nicht** zur Katalog-Abdeckung (bestehendes Verhalten beweisen, nicht annehmen).
   - Kein Netz nötig: `node scripts/build-dataset.mjs` und `npm test` laufen ohne Abruf.
   - Regressionstest, dass Real-SWE die bestehenden Composite-Slots und die vorhandenen
     Coding-Einträge (AA v1.4/v1.5) nicht verändert.
8. **Dokumentation**: `data/SCHEMA.md` (neue Quelle, Harness-Dimension, KI-Felder),
   `docs/benchmark-ingestion.md` (was Real-SWE anders macht), `CHANGELOG.md`, `API.md`
   falls neue Felder über die API gehen, `COVERAGE.md`.
9. **Oberfläche**: die neue Quelle erscheint mit Harness-Kennzeichnung, Stichproben-Hinweis
   (10 veröffentlichte Tasks), KI-Spanne und Kosten je Rollout. Beleg: Screenshot und
   Roh-HTTP-Abruf der Live-Seite nach dem Deploy.
10. **Gauntlet-Runde** gegen die hashgebundenen Quellbytes: ein Kritiker, der die Werte
    nicht erzeugt hat, prüft jede Zahl der Beobachtungen gegen die Quelle und die
    Modellidentitäten gegen den Katalog. Befunde ausräumen, Rest ehrlich notieren.

## Abnahme

- `node scripts/build-dataset.mjs`, `npm test`, `npx tsc --noEmit -p .` grün.
- Registry-ID, Beobachtungen und Lock-Eintrag vorhanden, Hash-gebunden, ohne Netzzugriff
  reproduzierbar; die 640-Probe geht auf.
- Mindestens eine Oberflächenprüfung an echten Bytes (Screenshot oder HTML-Abruf) zeigt
  Real-SWE mit Harness und Stichprobenhinweis.
- Jede genannte Zahl ist aus einem ausgeführten Befehl oder der hashgebundenen Quelle
  belegt. Was nicht umgesetzt wurde, steht als nicht umgesetzt mit Grund im Bericht.
- Bericht in `ops/rebuild-2026-09/REPORT.md`, Eintrag in `CHANGELOG.md`, Commit + Push,
  dann `DONE` als letzte Zeile von `/opt/benchmarkheaven/state/phase-11.status`.

## Zusatzauftrag aus der Nachtprüfung (12.09., bindend)

Bei der unabhängigen Nachprüfung von Phase 10 am gebauten Datensatz
(`data/dataset.json`, `benchmark_results.historical`) ist aufgefallen: die
`not_comparable`-Zeilen (482 von 542) tragen `reason: null` und nur einen
allgemeinen Hinweis. Damit kann die Oberfläche nicht sagen, **warum** keine Schätzung
möglich ist — zu wenige Brücken (unter 3) oder Streuung über 25 %. Das ist für dich ein
kleiner Nebenauftrag: Ursache je Zeile maschinenlesbar ergänzen
(`insufficient_bridges` / `spread_too_wide`, jeweils mit der konkreten Zahl), im Bericht
nennen und mit einem Test absichern. Verifiziere dabei auch, dass die 60 geschätzten Zeilen
je Zeile `bridge_count`, Streuung und Unsicherheit tragen (Stichprobe im Bericht zitieren).

## Zusätzliche Abnahmebedingung (bindend, aus Phase 10)

Wenn Phase 10 abgeschlossen ist, muss die neue Quelle **auch historisch vergleichbar** sein:
der erste Real-SWE-Stand wird als datierter Snapshot abgelegt (nicht nur als aktueller
Wert), damit spätere Stände über Brückenmodelle gegen diesen Stand geschätzt werden können.
Ist Phase 10 gescheitert, gehört das hier als ausdrücklich genannter offener Punkt hin.
