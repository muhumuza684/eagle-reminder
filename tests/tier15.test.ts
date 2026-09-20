import assert from "node:assert/strict";
import * as mod from "../lib/tier15/voice-intent-layer.ts";
console.log("Tier 15 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
