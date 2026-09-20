export type ScreenState<T> =
  | {kind:"loading"}
  | {kind:"empty"; message:string}
  | {kind:"ready"; data:T}
  | {kind:"error"; message:string; retryable:boolean}
  | {kind:"offline"; data?:T};
export function ready<T>(data:T):ScreenState<T>{ return {kind:"ready",data}; }
export function offline<T>(data?:T):ScreenState<T>{ return {kind:"offline",data}; }
export function failure<T>(message:string,retryable=true):ScreenState<T>{ return {kind:"error",message,retryable}; }
