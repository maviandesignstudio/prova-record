# Prova record

The live record behind prova. Every night a job writes, for every scoreboard market, the last closed day's price and what each of the catalog strategies said to do at that close. One line per market per day, append only. Each line's fingerprint is sha256 of the previous line's fingerprint, a bar, the date, the market, the close, and the position string (one character per strategy in catalog order: 1 holding, 0 out, 5 half in).

- data/record.json: the record.
- tools/record_day.js: the job. assets/engine.js: the strategy engine it uses, the same file the site runs.
- Git history is the audit log: every nightly commit shows when a line was written. Nothing is rewritten.

Education only. Paper money. Not advice. A record of what each rule said at each close, not a forecast.
