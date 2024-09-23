import { Response } from 'express';
import { ErrorResponseSchema } from '../schemas/errorSchema';
import { imageService } from '../services/imageService';

interface GetBackgroundParams {
  x: number;
  y: number;
  userPrompt?: string;
  aiService?: string;
  world?: string;
}

export async function getBackground(params: GetBackgroundParams, res: Response): Promise<void> {
  try {
    const imageData = await imageService.getBackgroundImage(params);
    res.json({
      imageData: `data:image/png;base64,${imageData}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in getBackground:', error.message);
      const errorResponse = ErrorResponseSchema.parse({
        error: 'Failed to load or generate background image',
        message: error.message,
      });
      res.status(500).json(errorResponse);
    }
  }
}
