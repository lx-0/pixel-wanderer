import { Metadata } from '../schemas/metadataSchema';

export interface GenerateImageParams {
  prompt: string;
  inputImages?: Buffer[]; // For image-to-image mode
  mode: 'text-to-image' | 'image-to-image';
}

export interface GenerateImageResult {
  imageBuffer: Buffer;
  metadata: Pick<Metadata, 'service' | 'mode' | 'seed' | 'generationMeta'>;
}

export interface AiServiceInterface {
  generateImage(params: GenerateImageParams): Promise<GenerateImageResult>;
}
