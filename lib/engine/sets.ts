export function intersection<T>(a:ReadonlySet<T>,b:ReadonlySet<T>):Set<T>{return new Set([...a].filter(x=>b.has(x)));}
export function union<T>(a:ReadonlySet<T>,b:ReadonlySet<T>):Set<T>{return new Set([...a,...b]);}
export function difference<T>(a:ReadonlySet<T>,b:ReadonlySet<T>):Set<T>{return new Set([...a].filter(x=>!b.has(x)));}
