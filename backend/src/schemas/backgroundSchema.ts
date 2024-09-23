import { z } from 'zod';
import { supportedAiServices } from '../ai_services/aiServiceFactory';

export const backgroundRequestSchema = z.object({
  x: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), { message: 'Invalid x parameter' }),
  y: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), { message: 'Invalid y parameter' }),
  userPrompt: z.string().optional(),
  aiService: z
    .string()
    .optional()
    .refine((val) => !val || supportedAiServices.includes(val), {
      message: `Invalid aiService parameter. Supported services are: ${supportedAiServices.join(', ')}`,
    }),
  world: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid world parameter') // Only allow alphanumeric, underscores, and hyphens
    .optional(),
});
