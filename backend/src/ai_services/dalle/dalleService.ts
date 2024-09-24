import axios from 'axios';
import {
  AiServiceInterface,
  GenerateImageParams,
  GenerateImageResult,
} from '../aiServiceInterface';
import { aiResponseSchema } from './schemas/aiResponseSchema';

export const dalleService: AiServiceInterface = {
  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const { prompt, inputImages, mode } = params;

    if (mode === 'image-to-image' && inputImages && inputImages.length > 0) {
      // DALL·E does not support image-to-image directly, so we need to handle this accordingly.
      // For the sake of this example, we'll proceed with text-to-image.
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          prompt: prompt,
          n: 1,
          size: '512x512',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      // Validate and parse the API response using Zod
      const parsedResponse = aiResponseSchema.parse(response.data);
      const imageUrl = parsedResponse.data[0].url;

      // Fetch the image from the URL
      const imageResponse = await axios.get<unknown>(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer);

      const metadata = {
        service: 'DALL·E',
        mode,
        seed: undefined,
        generationMeta: {},
      };

      return { imageBuffer, metadata };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('DALL·E API error:', error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error('DALL·E API error:', error.message);
      }
      throw new Error('DALL·E image generation failed');
    }
  },
};
