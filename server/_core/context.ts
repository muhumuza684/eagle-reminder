import type { User } from "../../drizzle/schema";

export type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  protocol?: string;
  get?: (name: string) => string | undefined;
};

export type ResponseLike = {
  cookie: (...args: any[]) => void;
  clearCookie: (...args: any[]) => void;
  status?: (code: number) => ResponseLike;
  json?: (value: unknown) => void;
};

export type AuthContext = {
  req: RequestLike;
  res: ResponseLike;
  user: User | null;
};

export function createContext(input: {
  req: RequestLike;
  res: ResponseLike;
  user?: User | null;
}): AuthContext {
  return {
    req: input.req,
    res: input.res,
    user: input.user ?? null,
  };
}
