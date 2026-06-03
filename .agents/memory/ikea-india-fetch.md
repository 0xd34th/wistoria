---
name: India fetch checkpoint saves
description: The IKEA India fetch script must save intermediate checkpoints or data is lost when the bash tool times out before the process completes.
---

## Rule
The `fetchIkeaIndia.ts` script must write `ikeaSeedIndia.json` periodically during the run (checkpoint every N terms), not only at the very end.

**Why:** The Replit bash tool has a hard timeout. With 390 search terms at 6-concurrency + 400ms throttle, the full run takes ~110 seconds — which exceeds the tool's default 60s timeout. If the only `writeFileSync` call is at the end, the output file stays as the placeholder `[]` when the process is killed.

**How to apply:** In the `run()` loop, after every `CHECKPOINT_EVERY` (currently 30) completed terms, filter and write partial results to `OUT_PATH`. The final complete write at the end of the loop is the canonical output. This pattern means a partial run still produces usable data.

Run the full fetch with a 110-second timeout:
```
timeout 110 pnpm --filter @workspace/scripts run fetchIkeaIndia
```
