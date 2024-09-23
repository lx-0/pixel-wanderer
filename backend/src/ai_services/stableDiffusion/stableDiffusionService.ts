// stableDiffusionService.ts
import axios from 'axios';
import FormData from 'form-data';
import {
  AiServiceInterface,
  GenerateImageParams,
  GenerateImageResult,
} from '../aiServiceInterface';
import { aiResponseSchema } from './schemas/aiResponseSchema';

export const stableDiffusionService: AiServiceInterface = {
  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const { prompt, inputImages, mode } = params;

    try {
      // Use form-data package to construct the multipart/form-data request
      const formData = new FormData();
      formData.append('prompt', prompt);
      if (mode === 'image-to-image' && inputImages && inputImages.length > 0) {
        inputImages.forEach((image, index) => {
          formData.append(`image${index}`, image, {
            filename: `input${index}.png`,
            contentType: 'image/png',
          });
        });
      }
      // Additional parameters can be added to formData as needed

      const headers = formData.getHeaders();

      const response = await axios.post('https://api.stable-diffusion.com/v1/generate', formData, {
        headers: {
          ...headers,
          Authorization: `Bearer ${process.env.STABLE_DIFFUSION_API_KEY}`,
        },
      });

      // Validate and parse the API response using Zod
      const parsedResponse = aiResponseSchema.parse(response.data);
      const imageBase64 = parsedResponse.images[0]; // Assume response contains base64 images

      const imageBuffer = Buffer.from(imageBase64, 'base64');

      const metadata = {
        service: 'Stable Diffusion',
        mode,
      };

      return { imageBuffer, metadata };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Stable Diffusion API error:', error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error('Stable Diffusion API error:', error.message);
      }
      throw new Error('Stable Diffusion image generation failed');
    }
  },
};
