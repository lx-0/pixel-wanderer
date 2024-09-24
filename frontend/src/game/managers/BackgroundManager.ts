import {
  CHUNK_HEIGHT,
  CHUNK_WIDTH,
  LAYER_DEPTHS,
  VISIBLE_CHUNKS,
  WORLD_NAME,
} from '@/game/constants/GameConstants';
import { fetchBackground } from '@/game/services/BackgroundService';
import { log } from '@/main';
import Phaser from 'phaser';

/**
 * Manages background chunks, including loading, unloading, and positioning.
 */
export class BackgroundManager {
  private scene: Phaser.Scene;
  private backgroundGroup!: Phaser.GameObjects.Group;
  private loadedChunks = new Map<string, Phaser.GameObjects.Image>();
  private isLoadingChunk = false;

  private currentChunkX = 0;
  private aiService: string;

  // Debugging
  private chunkDebugTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor(scene: Phaser.Scene, aiService: string) {
    this.scene = scene;
    this.aiService = aiService;
    this.backgroundGroup = this.scene.add.group();
  }

  /**
   * Loads the initial set of visible chunks.
   */
  async loadInitialChunks() {
    await this.loadVisibleChunks(0, 0);
  }

  /**
   * Updates the background manager each frame.
   * @param playerX - The player's current x position.
   */
  update(playerX: number) {
    this.checkNewChunkLoad(playerX);
  }

  /**
   * Checks if new chunks need to be loaded based on player position.
   * @param playerX - The player's current x position.
   */
  private checkNewChunkLoad(playerX: number) {
    const chunkX = Math.floor(playerX / CHUNK_WIDTH);
    const chunkY = 0;

    if (chunkX !== this.currentChunkX) {
      this.currentChunkX = chunkX;
      this.loadVisibleChunks(chunkX, chunkY);
    }
  }

  /**
   * Loads all chunks that should be visible based on the player's current chunk.
   * @param centerChunkX - The chunk index where the player is currently located.
   * @param centerChunkY - The vertical chunk index (assumed to be 0 in this case).
   */
  private async loadVisibleChunks(centerChunkX: number, centerChunkY: number) {
    const halfVisibleChunks = Math.floor(VISIBLE_CHUNKS / 2);

    for (let dx = -halfVisibleChunks; dx <= halfVisibleChunks; dx++) {
      const chunkX = centerChunkX + dx;
      const chunkY = centerChunkY;

      const chunkKey = `${chunkX}_${chunkY}`;
      if (!this.loadedChunks.has(chunkKey)) {
        await this.loadNewChunk(chunkX, chunkY);
      }
    }

    // Unload offscreen chunks
    this.unloadOffscreenChunks(centerChunkX, centerChunkY);
  }

  /**
   * Loads a new chunk at the specified coordinates.
   * @param chunkX - The x index of the chunk.
   * @param chunkY - The y index of the chunk.
   */
  private async loadNewChunk(chunkX: number, chunkY: number) {
    const chunkKey = `${chunkX}_${chunkY}`;
    if (this.isLoadingChunk || this.loadedChunks.has(chunkKey)) return;

    this.isLoadingChunk = true;

    try {
      const backgroundResponse = await fetchBackground(
        chunkX,
        chunkY,
        WORLD_NAME,
        undefined,
        this.aiService
      );

      const { imageData, metadata } = backgroundResponse;
      const { width, height } = metadata.imageDimensions;

      // Validate the image dimensions
      if (width !== CHUNK_WIDTH || height !== CHUNK_HEIGHT) {
        log.error(
          `Invalid chunk size: Expected ${CHUNK_WIDTH}x${CHUNK_HEIGHT}, but got ${width}x${height}`
        );
        // Optionally handle resizing or use a placeholder
        return;
      }

      // Use Phaser's Loader to load the image
      this.scene.load.image(`chunk_${chunkKey}`, imageData);

      this.scene.load.on('loaderror', (file: Phaser.Loader.File) => {
        if (file.key === `chunk_${chunkKey}`) {
          log.error(`Failed to load chunk ${chunkKey}:`, file);
        }
      });

      // Wait for the load to complete
      this.scene.load.once('complete', () => {
        // DEBUG: Check the Loaded Texture
        // const texture = this.textures.get(`chunk_${chunkKey}`);
        // console.log(
        //   `Texture size: ${texture.getSourceImage().width}x${texture.getSourceImage().height}`,
        //   { base64DataUri, texture, isExisting: this.textures.exists(`chunk_${chunkKey}`) }
        // );

        // Calculate the position
        const chunkPositionX = chunkX * CHUNK_WIDTH;

        // Add the new chunk to the scene
        const chunk = this.scene.add
          .image(chunkPositionX, 0, `chunk_${chunkKey}`)
          .setOrigin(0, 0)
          .setDepth(LAYER_DEPTHS.BACKGROUND);

        // Add chunk to the background group and cache
        this.backgroundGroup.add(chunk);
        this.loadedChunks.set(chunkKey, chunk);

        // DEBUG: Add debug text at the chunk's (0, 0) coordinate
        const chunkText = this.scene.add
          .text(
            chunkPositionX + 10, // Slight offset so it's visible
            10, // Y position at top
            `Chunk ${chunkX}`,
            { font: '16px Arial', color: 'black', backgroundColor: 'white' }
          )
          .setDepth(LAYER_DEPTHS.DEBUG.CHUNK_LABEL);
        this.chunkDebugTexts.set(chunkKey, chunkText);

        this.isLoadingChunk = false;
      });

      // Start the loader
      log.debug(`🍏 ~ Loading chunk ${chunkKey}`);
      this.scene.load.start();
    } catch (error) {
      log.error('Error loading new chunk:', error);
      // TODO: Use a fallback background or notify the player
    } finally {
      this.isLoadingChunk = false;
    }
  }

  /**
   * Unloads chunks that are no longer within the visible range.
   * @param centerChunkX - The current center chunk index on the x-axis.
   * @param _centerChunkY - The current center chunk index on the y-axis.
   */
  private unloadOffscreenChunks(centerChunkX: number, _centerChunkY: number) {
    const halfVisibleChunks = Math.floor(VISIBLE_CHUNKS / 2);

    // Determine the range of visible chunks
    const minVisibleChunkX = centerChunkX - halfVisibleChunks;
    const maxVisibleChunkX = centerChunkX + halfVisibleChunks;

    // Iterate over loaded chunks
    for (const [chunkKey, chunk] of this.loadedChunks.entries()) {
      const [chunkXStr, chunkYStr] = chunkKey.split('_');
      const chunkX = parseInt(chunkXStr, 10);
      const _chunkY = parseInt(chunkYStr, 10);

      // If the chunk is outside the visible range, remove it
      if (chunkX < minVisibleChunkX || chunkX > maxVisibleChunkX) {
        log.debug(`💥 ~ Unloading chunk ${chunkKey}`);

        chunk.destroy(); // Remove from the scene
        this.loadedChunks.delete(chunkKey); // Remove from the cache

        // DEBUG: Destroy associated debug text
        const text = this.chunkDebugTexts.get(chunkKey);
        if (text) {
          text.destroy();
          this.chunkDebugTexts.delete(chunkKey);
        }
      }
    }
  }

  /**
   * Sets the AI service to use for background generation.
   * @param aiService - The new AI service to use.
   */
  setAiService(aiService: string) {
    this.aiService = aiService;
  }
}
