import { Request, Response, Router } from 'express';
import { handleFetchOrGenerateBackground } from '../controllers/backgroundController';
import { backgroundFetchOrGenerateSchema } from '../schemas/backgroundFetchOrGenerateSchema';

const router = Router();

// Unified route for background generation (for both starter and other backgrounds)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { x, y, userPrompt, aiService, worldName } = backgroundFetchOrGenerateSchema.parse(
      req.body
    );

    await handleFetchOrGenerateBackground({ x, y, userPrompt, aiService, worldName }, res);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in background fetching/generation:', error.message);
      res.status(400).json({ error: error.message });
    }
  }
});

export default router;
