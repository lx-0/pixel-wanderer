import { z } from 'zod';

export const aiResponseSchema = z.object({
  data: z.array(
    z.object({
      url: z.string().url(),
    })
  ),
});
