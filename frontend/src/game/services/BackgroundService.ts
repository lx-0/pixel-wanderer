import { log } from '@/main';
import axios from 'axios';
import { z } from 'zod';

const API_URL = 'http://localhost:4000'; // Adjust if necessary

const backgroundResponseSchema = z.object({
  imageData: z.string(), // Base64-encoded image data
  metadata: z.object({
    // Define the metadata schema
    prompt: z.string(),
    createdAt: z.string(),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
    }),
    userPrompt: z.string().optional(),
    imageDimensions: z.object({
      width: z.number(),
      height: z.number(),
    }),
  }),
});
type BackgroundResponse = z.infer<typeof backgroundResponseSchema>;

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export const fetchBackground = async (
  chunkX: number,
  chunkY: number,
  worldName: string,
  userPrompt?: string,
  aiService?: string
): Promise<BackgroundResponse> => {
  // ! TODO REMOVE
  if (chunkX !== 0 || chunkY !== 0) throw new Error('DEACTIVATED');

  try {
    const response = await axios.post(`${API_URL}/background`, {
      x: chunkX,
      y: chunkY,
      userPrompt,
      aiService,
      worldName,
    });

    // Validate response using Zod
    const parsedResponse = backgroundResponseSchema.parse(response.data);
    return parsedResponse;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      try {
        // Try to parse the error response
        const parsedError = errorResponseSchema.parse(error.response.data);
        log.error(`Error fetching background: ${parsedError.message}`, parsedError);
      } catch {
        log.error(`Error fetching background: ${error.response.data}`, error);
      }
    } else if (error instanceof Error) {
      log.error(`Error fetching background: ${error.message}`, error);
    }
    throw error;
  }
};
