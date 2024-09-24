import { Response } from 'express';
import { ErrorResponseSchema } from '../schemas/errorSchema';
import { imageService } from '../services/imageService';

interface FetchOrGenerateBackgroundParams {
  x: number;
  y: number;
  userPrompt?: string;
  aiService?: string;
  worldName: string;
}

export async function handleFetchOrGenerateBackground(
  params: FetchOrGenerateBackgroundParams,
  res: Response
): Promise<void> {
  try {
    const { x, y, userPrompt, aiService, worldName } = params;

    // Fetch or generate the background (0,0 for starter or other backgrounds)
    const { base64Image, metadata } = await imageService.fetchOrGenerateBackground({
      x,
      y,
      userPrompt,
      aiService,
      worldName,
    });

    // Return base64-encoded image along with metadata
    res.json({
      imageData: `data:image/png;base64,${base64Image}`,
      metadata,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in background fetching/generation:', error.message);
      const errorResponse = ErrorResponseSchema.parse({
        error: 'Failed to fetch or generate background image',
        message: error.message,
      });
      res.status(500).json(errorResponse);
    }
  }
}
