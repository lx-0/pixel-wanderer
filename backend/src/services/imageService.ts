import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { getAiService } from '../ai_services/aiServiceFactory';
import { AiServiceInterface } from '../ai_services/aiServiceInterface';
import { Metadata } from '../types/metadata';
import { cache } from '../utils/cache';
import { promptGenerator } from '../utils/promptGenerator';

const generatedBackgroundsDir = path.join(__dirname, '../../generated_backgrounds');

interface GetBackgroundParams {
  x: number;
  y: number;
  userPrompt?: string;
  aiService?: string;
  world?: string;
}

export const imageService = {
  async getBackgroundImage(params: GetBackgroundParams): Promise<string> {
    const { x, y, userPrompt, aiService, world } = params;
    const worldName = world || 'default_world'; // Use 'default_world' if no world is specified

    // Construct the world-specific directory
    const worldDir = path.join(generatedBackgroundsDir, worldName);

    // Ensure the world directory exists
    if (!fsSync.existsSync(worldDir)) {
      fsSync.mkdirSync(worldDir, { recursive: true });
    }

    const cacheKey = `background_${worldName}_${x}_${y}_${aiService || 'default'}`;

    // Check if image data is in cache
    let base64Image = cache.get<string>(cacheKey);
    if (base64Image) {
      return base64Image;
    }

    const imagePath = path.join(worldDir, `background_x${x}_y${y}.png`);
    const metadataPath = path.join(worldDir, `background_x${x}_y${y}.json`);

    // Check if the image already exists
    if (fsSync.existsSync(imagePath)) {
      const imageData = await fs.readFile(imagePath);
      base64Image = imageData.toString('base64');
      cache.set(cacheKey, base64Image);
      return base64Image;
    } else {
      console.log(`Generating background at x=${x}, y=${y} for world ${worldName}`, { imagePath });
    }

    // Get the AI service implementation
    let aiServiceInstance: AiServiceInterface;
    try {
      aiServiceInstance = getAiService(aiService);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`AI Service Error: ${error.message}`);
      } else {
        throw new Error('Unknown AI Service Error');
      }
    }

    // Generate the prompt
    const prompt = await promptGenerator.generatePrompt(x, y, userPrompt, worldName);

    // Prepare input images (neighboring images)
    const inputImages = await promptGenerator.getNeighboringImages(x, y, worldName);

    // Generate the image using AI API
    const { imageBuffer, metadata } = await aiServiceInstance.generateImage({
      prompt,
      inputImages,
      mode: 'image-to-image',
    });

    // Save the image to the filesystem
    await fs.writeFile(imagePath, imageBuffer);

    // Save metadata
    const metadataToSave: Metadata = {
      ...metadata,
      prompt,
      createdAt: new Date().toISOString(),
      coordinates: { x, y },
      userPrompt: userPrompt || '',
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadataToSave, null, 2));

    // Convert image buffer to base64
    base64Image = imageBuffer.toString('base64');

    // Store in cache
    cache.set(cacheKey, base64Image);

    return base64Image;
  },
};
