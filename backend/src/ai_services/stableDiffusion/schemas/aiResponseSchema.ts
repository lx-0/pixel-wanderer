import { z } from 'zod';

export const aiResponseSchema = z.object({
  images: z.array(z.string()), // Base64 encoded images
});
