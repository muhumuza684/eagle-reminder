import type { Evidence } from "./types";
export type MemoryKind = "explicit"|"observed"|"inferred";
export type EagleMemory = { id:string; kind:MemoryKind; statement:string; confidence:number; createdAt:string; updatedAt:string; provenance:Evidence[] };
export function upsertMemory(memories:EagleMemory[], memory:EagleMemory):EagleMemory[]{ const existing=memories.findIndex(m=>m.id===memory.id); if(existing<0)return[...memories,memory]; const copy=[...memories]; copy[existing]=memory; return copy; }
