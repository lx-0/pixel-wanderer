import Phaser from 'phaser';
import { fetchBackground } from '../../services/BackgroundService';

// Constants
const CHUNK_SIZE = 800;
const VIEW_WIDTH = 800; // TODO: set to 1600
const VIEW_HEIGHT = 600; // TODO: set to 1200
const VISIBLE_CHUNKS = 3; // Number of chunks to keep loaded around the player

const WORLD_BOUND_LEFT = -100000;
const WORLD_BOUND_WIDTH = 200000;

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private backgroundGroup!: Phaser.GameObjects.Group;

  private currentChunkX = 0;
  private currentChunkY = 0;

  private isLoadingChunk = false;
  private loadedChunks = new Map<string, Phaser.GameObjects.Image>();

  private totalShiftX = 0;
  private justShifted = false;
  private shiftCooldownTimer?: Phaser.Time.TimerEvent;

  // DEBUG
  private debug = false;
  private toggleDebug: Phaser.Input.Keyboard.Key | undefined;
  private chunkDebugTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super('MainScene');
  }

  // Utility function to load multiple assets
  private loadAssets(assetList: { key: string; path: string }[]) {
    assetList.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });
  }

  // In preload()
  preload() {
    const assets = [
      { key: 'player', path: '/assets/player.png' },
      // Add more assets as needed
    ];

    this.loadAssets(assets);

    // DEBUG
    this.textures.on('onload', (key: unknown) => {
      console.log(`Texture loaded: ${key}`);
    });
    this.textures.on('onerror', (key: unknown) => {
      console.error(`Texture failed to load: ${key}`);
    });
  }
  async create() {
    // Set world bounds (extend infinitely in the x-direction)
    this.physics.world.setBounds(WORLD_BOUND_LEFT, 0, WORLD_BOUND_WIDTH, VIEW_HEIGHT);
    this.cameras.main.setBounds(WORLD_BOUND_LEFT, 0, WORLD_BOUND_WIDTH, VIEW_HEIGHT);

    // Initialize background group
    this.backgroundGroup = this.add.group();

    // Load the initial background chunk
    await this.loadVisibleChunks(0, 0);

    // Create the player sprite after loading the background
    this.createPlayer();

    // Center the camera on the player at game start
    this.cameras.main.scrollX = this.player.x - this.cameras.main.width / 2;

    // DEBUG: Debug graphics on keyboard press Q
    this.physics.world.drawDebug = false;
    this.toggleDebug = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
  }

  createPlayer() {
    // Create the player sprite at position (0, 300)
    const initialPlayerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
    this.player = this.physics.add.sprite(initialPlayerX, VIEW_HEIGHT, 'player');
    this.player.setCollideWorldBounds(true); // Ensure the player doesn't move beyond the world's bounds
    this.player.setScale(0.5); // Adjust the player's size
    this.player.setDepth(1); // Ensure the player is drawn above the backgrounds

    // Create cursor keys for movement
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    } else {
      // Handle the case where keyboard input is not available
      console.error('Keyboard input is not available.');
    }
  }

  update() {
    if (!this.player) return;

    this.handlePlayerMovement();
    this.checkNewChunkLoad(); // Calculate current chunk based on player position
    this.checkPositionShift();
    this.handleCameraMovement();

    // DEBUG: Debug Graphic
    if (this.toggleDebug && Phaser.Input.Keyboard.JustDown(this.toggleDebug)) {
      this.debug = !this.debug;
      if (this.physics.world.drawDebug) {
        this.physics.world.debugGraphic.clear();
      }
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
    }
    // DEBUG: Camera Position
    if (this.debug) {
      console.log(`Player position: (${this.player.x}, ${this.player.y})`);
      console.log(
        `Camera position: (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY}), CameraRight: ${this.cameras.main.scrollX + this.cameras.main.width}`
      );
    }
  }

  private handlePlayerMovement() {
    const speed = 160;

    if (!this.cursors) return;

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up?.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down?.isDown) {
      this.player.setVelocityY(speed);
    } else {
      this.player.setVelocityY(0);
    }
  }

  private handleCameraMovement() {
    if (this.justShifted) {
      // Skip camera movement if we've just shifted positions
      return;
    }

    const camera = this.cameras.main;
    const playerX = this.player.x;
    const cameraLeft = camera.scrollX;
    const cameraRight = camera.scrollX + camera.width;

    const leftBoundary = cameraLeft + camera.width * 0.25;
    const rightBoundary = cameraLeft + camera.width * 0.75;

    // Check if player is beyond the left or right boundary
    if (playerX < leftBoundary || playerX > rightBoundary) {
      // Center the camera on the player smoothly
      if (!camera.panEffect.isRunning) {
        camera.pan(
          playerX, // Target x position
          camera.scrollY, // Keep y position the same
          1500, // Duration in milliseconds
          'Power2' // Easing function
          // TODO test uncomment: 'Sine.easeInOut' // Easing function (options include 'Linear', 'Sine.easeInOut', etc.)
        );
      }
    }
  }

  private checkNewChunkLoad() {
    const playerWorldX = this.player.x + this.totalShiftX;
    const chunkX = Math.floor(playerWorldX / CHUNK_SIZE);
    const chunkY = 0; // Assuming vertical movement isn't infinite

    if (chunkX !== this.currentChunkX) {
      this.currentChunkX = chunkX;
      this.loadVisibleChunks(chunkX, chunkY);
    }
  }

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

  private async loadNewChunk(chunkX: number, chunkY: number) {
    const chunkKey = `${chunkX}_${chunkY}`;
    if (this.isLoadingChunk || this.loadedChunks.has(chunkKey)) return;

    this.isLoadingChunk = true;

    try {
      const base64DataUri = await fetchBackground(chunkX, chunkY);

      // Use Phaser's Loader to load the image
      this.load.image(`chunk_${chunkKey}`, base64DataUri);

      this.load.on('loaderror', (textureKey: string) => {
        console.error(`Failed to load chunk ${chunkKey}:`, textureKey);
      });

      // Wait for the load to complete
      this.load.once('complete', () => {
        // DEBUG: Check the Loaded Texture
        // const texture = this.textures.get(`chunk_${chunkKey}`);
        // console.log(
        //   `Texture size: ${texture.getSourceImage().width}x${texture.getSourceImage().height}`,
        //   { base64DataUri, texture, isExisting: this.textures.exists(`chunk_${chunkKey}`) }
        // );

        // Calculate the position considering totalShiftX
        const chunkPositionX = chunkX * CHUNK_SIZE - this.totalShiftX;

        // Add the new chunk to the scene
        const chunk = this.add
          .image(chunkPositionX, 0, `chunk_${chunkKey}`)
          .setOrigin(0, 0)
          .setDepth(0);

        // Add chunk to the background group and cache
        this.backgroundGroup.add(chunk);
        this.loadedChunks.set(chunkKey, chunk);

        // DEBUG
        // Add debug text at the chunk's (0, 0) coordinate
        const chunkText = this.add.text(
          chunkPositionX + 10, // Slight offset so it's visible
          10, // Y position at top
          `Chunk (${chunkX}, ${chunkY})`,
          { font: '16px Arial', color: 'black', backgroundColor: 'white' }
        );
        chunkText.setDepth(1); // Ensure it's above the background
        this.chunkDebugTexts.set(chunkKey, chunkText);

        this.isLoadingChunk = false;
      });

      // Start the loader
      console.log(`Loading chunk ${chunkKey}`);
      this.load.start();
    } catch (error) {
      console.error('Error loading new chunk:', error);
      // TODO: Use a fallback background or notify the player
    } finally {
      this.isLoadingChunk = false;
    }
  }

  private unloadOffscreenChunks(centerChunkX: number, centerChunkY: number) {
    const halfVisibleChunks = Math.floor(VISIBLE_CHUNKS / 2);

    // Determine the range of visible chunks
    const minVisibleChunkX = centerChunkX - halfVisibleChunks;
    const maxVisibleChunkX = centerChunkX + halfVisibleChunks;

    // Iterate over loaded chunks
    for (const [chunkKey, chunk] of this.loadedChunks.entries()) {
      const [chunkXStr, chunkYStr] = chunkKey.split('_');
      const chunkX = parseInt(chunkXStr, 10);
      const chunkY = parseInt(chunkYStr, 10);

      // If the chunk is outside the visible range, remove it
      if (chunkX < minVisibleChunkX || chunkX > maxVisibleChunkX) {
        // DEBUG
        console.log(`Unloading chunk: (${chunkX}, ${chunkY})`);

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

  private checkPositionShift() {
    if (Math.abs(this.player.x) >= CHUNK_SIZE && !this.cameras.main.panEffect.isRunning) {
      const shiftAmount = this.player.x > 0 ? -CHUNK_SIZE : CHUNK_SIZE;

      console.log(`SHIFT: Shifted by ${this.player.x > 0 ? 'right' : 'left'}`, { shiftAmount });

      // Subtract shiftAmount from totalShiftX
      this.totalShiftX -= shiftAmount;

      // Shift all background chunks
      this.backgroundGroup.children.each((child) => {
        (child as Phaser.GameObjects.Image).x += shiftAmount;
        return true;
      });

      // Shift the player
      this.player.x += shiftAmount;

      // Shift the camera
      this.cameras.main.scrollX += shiftAmount;

      // Adjust camera pan destination if panning
      if (this.cameras.main.panEffect.isRunning) {
        console.log('Adjusting camera pan destination');
        this.cameras.main.panEffect.destination.x += shiftAmount;
      }

      // Set a flag to prevent immediate panning
      this.justShifted = true;
      this.shiftCooldownTimer = this.time.addEvent({
        delay: 100, // 100 ms cooldown
        callback: () => (this.justShifted = false),
      });

      // DEBUG: Shift all debug texts
      this.chunkDebugTexts.forEach((text) => {
        text.x += shiftAmount;
      });
    }
  }
}
