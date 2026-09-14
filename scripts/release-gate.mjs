import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const required=["package.json","app.json","desktop/main.cjs","desktop/preload.cjs","tsconfig.json"];
for(const f of required) if(!existsSync(f)) throw new Error(`Release gate missing ${f}`);
const pkg=JSON.parse(readFileSync("package.json","utf8"));
if(!pkg.version || pkg.version.startsWith("0.")) throw new Error("Release gate requires a production version");
execFileSync(process.platform==="win32"?"node":"node",["node_modules/typescript/bin/tsc","--noEmit"],{stdio:"inherit"});
console.log(`RELEASE GATE PASS — D-Eagle Hub ${pkg.version}`);
