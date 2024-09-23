import { log } from '@/main';
import axios from 'axios';
import { z } from 'zod';

const API_URL = 'http://localhost:4000'; // Adjust if necessary

const backgroundResponseSchema = z.object({
  imageData: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export const fetchBackground = async (
  chunkX: number,
  chunkY: number,
  userPrompt?: string,
  aiService?: string,
  world?: string
): Promise<string> => {
  try {
    const response = await axios.get(`${API_URL}/background`, {
      params: {
        x: chunkX.toString(),
        y: chunkY.toString(),
        userPrompt,
        aiService,
        world,
      },
    });

    // Validate response using Zod
    const parsedResponse = backgroundResponseSchema.parse(response.data);
    return parsedResponse.imageData;
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
