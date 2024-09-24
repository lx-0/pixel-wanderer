import { z } from 'zod';
import { supportedAiServices } from '../ai_services/aiServiceFactory';

export const backgroundFetchOrGenerateSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  userPrompt: z.string().optional(),
  worldName: z
    .string()
    .min(1, 'World name is required')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Invalid world name. Only alphanumeric characters, underscores, and hyphens are allowed.'
    ),
  aiService: z
    .string()
    .optional()
    .refine((val) => !val || supportedAiServices.includes(val), {
      message: `Invalid aiService parameter. Supported services are: ${supportedAiServices.join(', ')}`,
    }),
});
