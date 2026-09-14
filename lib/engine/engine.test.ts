import {describe,expect,it} from "vitest"; import {topologicalOrder} from "./graph"; import {zScore} from "./statistics";
describe("Eagle Engine",()=>{it("orders dependencies",()=>expect(topologicalOrder(["a","b","c"],[{from:"a",to:"b"},{from:"b",to:"c"}])).toEqual(["a","b","c"]));it("detects anomalies with z score",()=>expect(zScore(10,[1,2,3,4,5])).toBeGreaterThan(1));});
