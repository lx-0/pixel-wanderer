// stableDiffusionService.ts
import axios from 'axios';
import FormData from 'form-data';
import { log } from '../../server';
import {
  AiServiceInterface,
  GenerateImageParams,
  GenerateImageResult,
} from '../aiServiceInterface';

const loggerContext = ['AIService', 'StableDiffusion'];

export const stableDiffusionService: AiServiceInterface = {
  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const { prompt, inputImages, mode } = params;

    try {
      // Use form-data package to construct the multipart/form-data request
      const formData = new FormData();
      formData.append('prompt', prompt);
      // formData.append('negative_prompt', negative_prompt);
      formData.append('output_format', 'png');
      formData.append('aspect_ratio', '21:9');

      if (mode === 'image-to-image' && inputImages && inputImages.length > 0) {
        inputImages.forEach((image, index) => {
          formData.append(`image${index}`, image, {
            filename: `input${index}.png`,
            contentType: 'image/png',
          });
        });
      }

      const headers = {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.STABLE_DIFFUSION_API_KEY}`,
        accept: 'image/*',
      };

      log.debug(
        'Generating image using Stable Diffusion API',
        {
          mode,
          prompt,
          inputImages,
        },
        loggerContext
      );

      const response = await axios.post(
        'https://api.stability.ai/v2beta/stable-image/generate/sd3',
        formData,
        {
          headers,
          responseType: 'arraybuffer',
        }
      );

      log.debug(
        'Response received from Stable Diffusion API',
        {
          ...(process.env.DEBUG && {
            // response: response.data,
            headers: response.headers,
          }),
        },
        loggerContext
      );

      // Check the response headers for metadata
      const seed = response.headers['seed'];
      const serverTiming = response.headers['server-timing'];
      const billingInfo = response.headers['x-billing-information'];
      const contentType = response.headers['content-type'];
      const billingIdempotencyId = response.headers['x-fireworks-billing-idempotency-id'];
      const upstreamServiceTimeMs = response.headers['x-envoy-upstream-service-time'];

      // Extract times from headers
      const generationTimeMs = Number(response.headers['fireworks-request-generation-ms']);
      const postProcessingTimeMs = Number(response.headers['fireworks-request-postprocessing-ms']);
      const preProcessingTimeMs = Number(response.headers['fireworks-request-preprocessing-ms']);
      const totalRequestRuntimeMs = Number(response.headers['fireworks-request-runtime-ms']);

      if (!contentType.includes('image/png')) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      // The image is returned as an ArrayBuffer
      const imageBuffer = Buffer.from(response.data as ArrayBuffer);

      // Define metadata manually or based on response headers if available
      const metadata = {
        service: 'StableDiffusion',
        mode,
        seed: seed, // Include seed if available
        generationMeta: {
          serverTiming, // Include server-timing if available
          billingInfo, // Include billing info if available
          generationTimeMs,
          postProcessingTimeMs,
          preProcessingTimeMs,
          totalRequestRuntimeMs,
          upstreamServiceTimeMs,
          billingIdempotencyId,
        },
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
