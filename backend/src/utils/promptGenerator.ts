import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Metadata } from '../types/metadata';

const generatedBackgroundsDir = path.join(__dirname, '../../generated_backgrounds');

export const promptGenerator = {
  async generatePrompt(x: number, y: number, userPrompt?: string, world?: string): Promise<string> {
    const worldName = world || 'default_world';
    const initialStyle = await this.getStartingTheme(worldName);
    const neighboringStyles = await this.getNeighboringPrompts(x, y, worldName);

    let prompt = `${initialStyle}. Adjacent areas feature: ${neighboringStyles.join(', ')}.`;
    if (userPrompt) {
      prompt += ` User request: ${userPrompt}.`;
    }

    return prompt;
  },

  async getStartingTheme(world: string): Promise<string> {
    // Read starting theme from metadata of (0,0) or predefined
    const worldDir = path.join(generatedBackgroundsDir, world);
    const startingMetadataPath = path.join(worldDir, 'background_x0_y0.json');
    if (fsSync.existsSync(startingMetadataPath)) {
      const metadataContent = await fs.readFile(startingMetadataPath, 'utf-8');
      const metadata: Metadata = JSON.parse(metadataContent);
      return metadata.prompt || 'A detailed pixel art landscape of a mystical forest';
    }
    return 'A detailed pixel art landscape of a mystical forest';
  },

  async getNeighboringPrompts(x: number, y: number, world: string): Promise<string[]> {
    const directions = [
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 }, // Right
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 }, // Down
    ];

    const prompts: string[] = [];
    const worldDir = path.join(generatedBackgroundsDir, world);

    for (const dir of directions) {
      const neighborX = x + dir.dx;
      const neighborY = y + dir.dy;
      const metadataPath = path.join(worldDir, `background_x${neighborX}_y${neighborY}.json`);

      if (fsSync.existsSync(metadataPath)) {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata: Metadata = JSON.parse(metadataContent);
        prompts.push(metadata.prompt || 'continuation of the mystical forest');
      }
    }

    if (prompts.length === 0) {
      prompts.push('the mystical forest continues');
    }

    return prompts;
  },

  async getNeighboringImages(x: number, y: number, world: string): Promise<Buffer[]> {
    const directions = [
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 }, // Right
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 }, // Down
    ];

    const images: Buffer[] = [];
    const worldDir = path.join(generatedBackgroundsDir, world);

    for (const dir of directions) {
      const neighborX = x + dir.dx;
      const neighborY = y + dir.dy;
      const imagePath = path.join(worldDir, `background_x${neighborX}_y${neighborY}.png`);

      if (fsSync.existsSync(imagePath)) {
        const imageData = await fs.readFile(imagePath);
        images.push(imageData);
      }
    }

    return images;
  },
};
