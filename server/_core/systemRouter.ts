import { publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    service: "d-eagle-hub",
    timestamp: new Date().toISOString(),
  })),
});
