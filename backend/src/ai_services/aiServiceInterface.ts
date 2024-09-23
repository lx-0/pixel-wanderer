import { Metadata } from '../types/metadata';

export interface GenerateImageParams {
  prompt: string;
  inputImages?: Buffer[]; // For image-to-image mode
  mode: 'text-to-image' | 'image-to-image';
}

export interface GenerateImageResult {
  imageBuffer: Buffer;
  metadata: Partial<Pick<Metadata, 'prompt' | 'createdAt' | 'coordinates' | 'userPrompt'>> &
    Omit<Metadata, 'prompt' | 'createdAt' | 'coordinates' | 'userPrompt'>;
}

export interface AiServiceInterface {
  generateImage(params: GenerateImageParams): Promise<GenerateImageResult>;
}
