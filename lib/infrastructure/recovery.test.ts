import { describe, expect, it } from "vitest";
import { createRecoveryCheckpoint, validateRecoveryCheckpoint } from "./recovery";

describe("recovery", () => { it("round trips a checkpoint", () => { const c=createRecoveryCheckpoint(["a","b"]); expect(validateRecoveryCheckpoint(c)).toBe(true); }); });
