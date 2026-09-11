# Phase 10 — Frühere Benchmarkwerte behalten und historische Modelle relativ vergleichbar machen

Florians Anforderung (11.09.2026, wörtlich): *„weil manche benchmarks die alten modelle nicht mehr
messen, sollten wir die alten benchmarkwerte behalten und dann relativ mit den neuen benchmarks
vergleichen. also dann über die brückenmodelle … Spezifiziere und Implementiere das entsprechend …
für alle Benchmark Scores, nicht nur für einzelne"*.

Diese Phase steht bewusst nach Phase 09 und ist der letzte inhaltliche Baustein des Umbaus.

## Ausgangslage (belegt, nicht vermutet — vor der Arbeit nachprüfen)

- `data/raw/` ist der Rohbestand je Quelle (u. a. `benchmarks/scores.json`, `benchmarks/registry.json`,
  `benchmarks/public-observations.json`, `benchmarks/ingestion-lock.json`) plus datierte
  Evidenzpakete `benchmarks/daily-evidence/<ISO-Zeitstempel>/` mit Gauntlet-Paketen je Scoreset.
- `scripts/build-dataset.mjs` normalisiert alles zu `data/dataset.json` (Vertrag: `data/SCHEMA.md`).
- `scripts/seed-db.mjs` lädt das in Postgres: Tabellen `models`, `offers`, `dataset_meta`.
  Die App liest Postgres, wenn `DATABASE_URL` gesetzt ist, sonst das gebündelte JSON.
- Phase 05 hat versionierte Benchmark-Ergebnisse eingeführt: `benchmark_results` mit
  `schema_version: 1`, `registry`, `observations`, `missing`, `collections`, `rejected`,
  `divergences`, `coverage.by_model/by_benchmark`. Jede Beobachtung hat exakte `benchmark_id`,
  natives Wert/Unit, Basis (`measured`/`self_reported`/`derived`), Protokoll und vollständige
  Quellenherkunft. Typen: `lib/benchmark-scores.d.mts`, Laufzeitprüfungen:
  `lib/benchmark-scores.mjs`. **Darauf wird aufgebaut, nichts davon wird ersetzt.**
- Es gibt bisher **keine** Historie über die Zeit und **keinen** Vergleich zwischen Ständen.
  Genau das fehlt.

## Auftrag

1. **Historie statt Überschreiben.** Jeder Ingestion-Lauf erzeugt einen unveränderlichen,
   datierten Stand (Snapshot) aller Benchmark-Werte je Quelle und Benchmark, mit Quellversion,
   Abrufzeitpunkt und Hashes. Frühere Stände werden nie überschrieben oder gelöscht; wenn eine
   Quelle einen Wert nicht mehr publiziert, bleibt der alte Wert als historische Beobachtung
   erhalten und wird als „nicht mehr aktuell publiziert" gekennzeichnet, nicht als falsch.
   Bestehende Rohdateien und Evidenzpakete bleiben als Herkunft erhalten.
2. **Relativer Vergleich über Brückenmodelle** — für **alle** Benchmark-Scores, nicht nur
   einzelne Indizes: Für ein Modell H mit Wert `h_alt` in Stand `S_alt`, das in einem späteren
   Stand `S_neu` nicht mehr gemessen wird, werden die Modelle B bestimmt, die in beiden Ständen
   mit gültigem Wert vorkommen (Brücken). Für jedes Brückenmodell das Verhältnis
   `r_b = wert_neu(b) / wert_alt(b)`; daraus ein robustes Aggregat (Median) plus Streuung
   (Minimum, Maximum, Interquartilsabstand) und die Zahl der Brücken. Schätzung:
   `h_geschätzt = h_alt × Aggregat`, ausgewiesen mit Unsicherheit.
3. **Sonderfälle ausdrücklich lösen, nicht übergehen:**
   - ELO-/Battle-Boards (z. B. DesignArena) sind nicht linear skalierbar: dort über
     Rangverschiebung der Brückenmodelle vergleichen, nicht über Faktoren, und die
     Annahme im Bericht benennen.
   - Composite/abgeleitete Indizes werden neu berechnet, wenn ihre Eingangsslots einen neuen
     Stand haben; der abgeleitete Wert trägt den Stand seiner Eingänge.
   - Index-versionswechsel (z. B. eine neue Indexversion derselben Quelle) gelten als eigener
     Herkunftszweig, nicht als derselbe Wert.
   - Verschiedene Benchmarks niemals mischen: der Vergleich gilt je Benchmark.
4. **Ehrliche Grenzen.** Weniger als drei Brückenmodelle oder Streuung über ±25 % ⇒ Ergebnis
   ist „nicht vergleichbar" und die Oberfläche zeigt das als solches, mit Begründung. Eine
   Schätzung wird immer als Schätzung gekennzeichnet und nie als Messung ausgegeben.
5. **Oberfläche.** Filter und Ansicht, die historische Modelle einschließen: „alle Modelle, die
   in Kategorie Y besser sind als Modell X" muss auch Modelle enthalten, die im aktuellen Stand
   nicht mehr gemessen werden — mit Schätzabzeichen, Unsicherheit und der Zahl der Brückenmodelle
   (z. B. „relativ geschätzt über 6 Brückenmodelle, Streuung ±7 %").
6. **Tests** (nachweisbar, nicht behauptet):
   - Brückenmathematik mit synthetischen Werten, bei denen das Ergebnis bekannt ist: skalieren
     alle Brücken exakt um Faktor 2, muss die Schätzung exakt um Faktor 2 skalieren.
   - Ein Test, der die naive Gegenüberstellung alt/neu ohne Brücken **scheitern lässt**
     (direkte Gegenüberstellung roher alter und neuer Werte darf nicht möglich sein).
   - Ein Test auf echten Ständen: ein historisches Modell erhält eine Schätzung mit
     Brückenangabe, und ein Modell ohne genügend Brücken erhält „nicht vergleichbar".
   - Regressionstest, dass ein verschwundener Wert nicht aus dem Bestand gelöscht wird.
7. **Dokumentation.** `data/SCHEMA.md` und (falls die DB berührt wird)
   `ops/DEPLOYMENT.md`/Migrationshinweise um die neuen Felder/Tabellen ergänzen; im
   Phasenbericht (Anhang an `ops/rebuild-2026-09/REPORT.md`) erklären: Datenmodell, Formel,
   Sonderfälle, Unsicherheiten, was nicht geht.

## Abnahme (alles muss belegbar sein)

- `node scripts/build-dataset.mjs`, `npm test` und `npx tsc --noEmit -p .` laufen grün;
  die neuen Tests laufen im Testsatz mit und werden namentlich genannt.
- Die Oberfläche zeigt für mindestens ein echtes historisches Modell eine Schätzung mit
  Brückenzahl und Unsicherheit — mit Screenshot oder HTML-Beleg aus einem echten Lauf.
- Ein historischer Wert ist nach einem neuen Ingestion-Lauf noch vorhanden (Beleg: Vorher/
  Nachher-Auszug aus dem Bestand).
- Keine erfundenen Zahlen: jeder genannte Wert stammt aus einem ausgeführten Befehl oder einer
  Quelle, die im Bericht zitiert ist. Wo etwas nicht umgesetzt wurde, steht es ausdrücklich
  als nicht umgesetzt mit Grund.

Abschluss unverändert wie in den anderen Phasen: Gauntlet-Runde, Bericht, `DONE` als letzte
Zeile von `/opt/benchmarkheaven/state/phase-10.status`, committen und pushen.
