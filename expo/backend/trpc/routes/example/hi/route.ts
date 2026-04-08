import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

export default publicProcedure
  .input(z.object({ name: z.string().trim().min(1).max(100) }))
  .mutation(({ input }) => {
    return {
      hello: input.name,
      date: new Date(),
    };
  });
