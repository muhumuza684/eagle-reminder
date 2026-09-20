import assert from "node:assert/strict";
import * as mod from "../lib/tier13/personal-rhythm.ts";
console.log("Tier 13 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
