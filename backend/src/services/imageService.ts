import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getAiService } from '../ai_services/aiServiceFactory';
import { Metadata } from '../schemas/metadataSchema';
import { cache } from '../utils/cache';
import { promptGenerator } from '../utils/promptGenerator';

const generatedBackgroundsDir = path.join(__dirname, '../../generated_backgrounds');

interface FetchOrGenerateBackgroundParams {
  x: number;
  y: number;
  userPrompt?: string;
  aiService?: string;
  worldName: string;
}

export const imageService = {
  async fetchOrGenerateBackground({
    x,
    y,
    userPrompt,
    aiService,
    worldName,
  }: FetchOrGenerateBackgroundParams): Promise<{ base64Image: string; metadata: Metadata }> {
    const worldDir = path.join(generatedBackgroundsDir, worldName);

    // Check if the world directory exists for both starter and normal backgrounds
    if (!fsSync.existsSync(worldDir)) {
      if (x === 0 && y === 0) {
        // Create the world directory for the starter background if it doesn't exist
        fsSync.mkdirSync(worldDir, { recursive: true });
      } else {
        throw new Error(
          `World "${worldName}" does not exist. Create the starter background first.`
        );
      }
    }

    const cacheKey = `background_${worldName}_${x}_${y}_${aiService || 'default'}`;

    // Check if image data is in cache
    let base64Image = cache.get<string>(cacheKey);
    if (base64Image) {
      // Return base64 image and metadata from cache
      const metadata = await fs.readFile(
        path.join(worldDir, `background_x${x}_y${y}.json`),
        'utf-8'
      );
      return { base64Image, metadata: JSON.parse(metadata) };
    }

    const imagePath = path.join(worldDir, `background_x${x}_y${y}.png`);
    const metadataPath = path.join(worldDir, `background_x${x}_y${y}.json`);

    // Check if the image already exists
    if (fsSync.existsSync(imagePath)) {
      const imageData = await fs.readFile(imagePath);
      base64Image = imageData.toString('base64');
      const metadata = await fs.readFile(metadataPath, 'utf-8');

      // Store in cache
      cache.set(cacheKey, base64Image);

      return { base64Image, metadata: JSON.parse(metadata) };
    }

    // Get the AI service implementation
    const aiServiceInstance = getAiService(aiService);

    // Choose mode based on coordinates
    const mode = x === 0 && y === 0 ? 'text-to-image' : 'image-to-image';
    const inputImages =
      mode === 'image-to-image' ? await promptGenerator.getNeighboringImages(x, y, worldName) : [];

    // Generate the prompt (no neighboring prompts for starter background)
    const prompt = await promptGenerator.generatePrompt(x, y, userPrompt, worldName);

    // Generate the image using AI API
    const { imageBuffer, metadata } = await aiServiceInstance.generateImage({
      prompt,
      inputImages,
      mode,
    });

    // Save the image to the filesystem
    await fs.writeFile(imagePath, imageBuffer);

    // Use sharp to extract image dimensions and format
    const imageMetadata = await sharp(imageBuffer).metadata();
    const imageSize = imageBuffer.length;

    if (!imageMetadata.width || !imageMetadata.height) {
      throw new Error('Failed to extract image dimensions');
    }

    // Save metadata
    const metadataToSave: Metadata = {
      ...metadata,
      prompt,
      createdAt: new Date().toISOString(),
      coordinates: { x, y },
      userPrompt,
      imageSize, // Size of the image in bytes
      imageDimensions: {
        width: imageMetadata.width,
        height: imageMetadata.height,
      },
      format: imageMetadata.format, // Image format
      imageMetadata,
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadataToSave, null, 2));

    // Convert image buffer to base64
    base64Image = imageBuffer.toString('base64');

    // Store in cache
    cache.set(cacheKey, base64Image);

    return { base64Image, metadata: metadataToSave };
  },
};
