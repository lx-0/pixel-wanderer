import { VIEW_HEIGHT } from '@/config';

/**
 * Game constants used throughout the application.
 */
export const CHUNK_WIDTH = 1536; // Fixed width for all chunks
export const CHUNK_HEIGHT = VIEW_HEIGHT; // Fixed height for all chunks
export const VISIBLE_CHUNKS = 3; // Number of chunks to keep loaded around the player

export const WORLD_BOUND_LEFT = -100000;
export const WORLD_BOUND_WIDTH = 200000;
export const WORLD_NAME = 'forest';

export const LAYER_DEPTHS = {
  BACKGROUND: 10,
  PLAYER: 20,
  PLATFORMS: 30,
  UI: 100,
  DEBUG: {
    GRAPHICS: 50,
    PLAYER_TEXT: 50,
    CHUNK_LABEL: 11,
  },
};

/**
 * Available AI services for background generation.
 */
export const AVAILABLE_AI_SERVICES = ['dalle', 'stable-diffusion'];
