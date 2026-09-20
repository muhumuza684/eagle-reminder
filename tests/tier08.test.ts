import assert from "node:assert/strict";
import * as mod from "../lib/tier08/contextual-cues.ts";
console.log("Tier 08 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
