import { AiServiceInterface } from './aiServiceInterface';
import { dalleService } from './dalle/dalleService';
import { stableDiffusionService } from './stableDiffusion/stableDiffusionService';

export const supportedAiServices: string[] = ['dalle', 'stable-diffusion'];

export function getAiService(serviceName?: string): AiServiceInterface {
  switch (serviceName) {
    case 'dalle':
      return dalleService;
    case 'stable-diffusion':
      return stableDiffusionService;
    case undefined:
      return dalleService; // Default AI service
    default:
      throw new Error(`Unsupported AI service: ${serviceName}`);
  }
}
