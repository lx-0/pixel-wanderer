import { z } from 'zod';

// Zod schema for metadata including generation metadata and image metadata
export const metadataSchema = z.object({
  prompt: z.string().describe('The prompt that was used to generate the image.'),
  createdAt: z.string().describe('The timestamp when the image was generated.'),
  coordinates: z
    .object({
      x: z.number().describe('X coordinate of the image in the world.'),
      y: z.number().describe('Y coordinate of the image in the world.'),
    })
    .describe('Coordinates for the image in the world.'),
  userPrompt: z.string().optional().describe('Optional user-provided prompt for generation.'),
  service: z
    .string()
    .describe('The AI service used to generate the image, e.g., "StableDiffusion".'),
  mode: z
    .enum(['text-to-image', 'image-to-image'])
    .describe(
      'The mode used for generating the image, either "text-to-image" or "image-to-image".'
    ),
  seed: z
    .string()
    .optional()
    .describe('The seed value used for image generation, useful for reproducing the same image.'),

  // Generation metadata
  generationMeta: z
    .object({
      serverTiming: z
        .string()
        .optional()
        .describe('Total response time for generating the image, from server-timing header.'),
      billingInfo: z
        .object({
          modelName: z
            .string()
            .describe('The model used for generating the image, e.g., "stable-diffusion-v3-0".'),
          numSteps: z.number().describe('Number of inference steps used during image generation.'),
          numSamples: z.number().describe('Number of image samples generated during the request.'),
          height: z.number().describe('Height of the generated image in pixels.'),
          width: z.number().describe('Width of the generated image in pixels.'),
          controlNetName: z
            .string()
            .nullable()
            .optional()
            .describe('Name of the control net used, if applicable.'),
        })
        .optional()
        .describe(
          'Detailed billing information including model name, steps, samples, height, and width.'
        ),
      generationTimeMs: z
        .number()
        .optional()
        .describe('Time spent in the image generation phase in milliseconds.'),
      postProcessingTimeMs: z
        .number()
        .optional()
        .describe('Time spent in the post-processing phase in milliseconds.'),
      preProcessingTimeMs: z
        .number()
        .optional()
        .describe('Time spent in the pre-processing phase in milliseconds.'),
      totalRequestRuntimeMs: z
        .number()
        .optional()
        .describe('Total time the request took to complete in milliseconds.'),
      upstreamServiceTimeMs: z
        .number()
        .optional()
        .describe('Time taken by the upstream service in milliseconds.'),
      billingIdempotencyId: z
        .string()
        .optional()
        .describe('Unique ID for billing, ensuring idempotent billing requests.'),
    })
    .describe('Contains performance, billing, and generation-related metadata.'),

  // Flexible image metadata object
  imageMetadata: z.any().optional().describe('Image metadata extracted from the sharp library.'),

  imageSize: z.number().optional().describe('The size of the generated image in bytes.'),
  imageDimensions: z
    .object({
      width: z.union([z.number(), z.literal('unknown')]).describe('Width of the image in pixels.'),
      height: z
        .union([z.number(), z.literal('unknown')])
        .describe('Height of the image in pixels.'),
    })
    .describe('Dimensions of the generated image.'),

  format: z.string().optional().describe('The format of the generated image, e.g., "png".'),
});

// Infer the TypeScript type from the Zod schema
export type Metadata = z.infer<typeof metadataSchema>;
