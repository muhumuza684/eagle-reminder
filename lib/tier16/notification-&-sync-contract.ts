export type DeliveryResult={tokenId:string;status:"sent"|"invalid"|"retry"|"skipped";attempt:number};
export type SyncHealth={state:"online"|"offline"|"degraded";lastSuccessAt?:string;pendingMutations:number};
export function nextAttempt(result:DeliveryResult):number|undefined{
  if(result.status==="retry" && result.attempt<4)return result.attempt+1;
  return undefined;
}
