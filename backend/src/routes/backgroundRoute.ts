import { Request, Response, Router } from 'express';
import { getBackground } from '../controllers/backgroundController';
import { backgroundRequestSchema } from '../schemas/backgroundSchema';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Validate query parameters using Zod
    const params = backgroundRequestSchema.parse(req.query);
    await getBackground(params, res);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in background route:', error.message);
      res.status(400).json({ error: error.message });
    }
  }
});

export default router;
