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

    // Set global gravity
    this.physics.world.gravity.y = 300; // Adjust the gravity value as needed

    // Initialize background group
    this.backgroundGroup = this.add.group();

    // Create the player sprite after loading the background
    this.createPlayer();

    // Center the camera on the player at game start
    this.cameras.main.scrollX = this.player.x - this.cameras.main.width / 2;

    // Load the initial background chunk
    await this.loadVisibleChunks(0, 0);

    // Create ground platform
    this.createGround();

    // DEBUG: Debug graphics on keyboard press Q
    this.physics.world.drawDebug = false;
    this.physics.world.debugGraphic.clear();
    this.toggleDebug = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
  }

  createPlayer() {
    // Create the player sprite at position (0, 300)
    const initialPlayerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
    this.player = this.physics.add.sprite(initialPlayerX, 300, 'player');
    this.player.setCollideWorldBounds(false); // Allow movement beyond world bounds
    this.player.setScale(0.5); // Adjust the player's size
    this.player.setDepth(1); // Ensure the player is drawn above the backgrounds

    // Enable physics properties
    this.player.setBounce(0); // No bounce on landing
    this.player.setGravityY(300); // Apply gravity to the player

    // Create cursor keys for movement
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    } else {
      // Handle the case where keyboard input is not available
      console.error('Keyboard input is not available.');
    }
  }

  private createGround() {
    const ground = this.physics.add.staticGroup();
    const groundHeight = 5; // Height of the ground
    const groundY = VIEW_HEIGHT - groundHeight / 2;

    const groundRectangle = this.add.rectangle(
      WORLD_BOUND_LEFT,
      groundY,
      WORLD_BOUND_WIDTH,
      groundHeight,
      0x000000
    );
    groundRectangle.setOrigin(0, 0.5); // Set origin to align correctly
    groundRectangle.setDepth(2);
    ground.add(groundRectangle);

    // Enable collision between player and ground
    this.physics.add.collider(this.player, ground);
  }

  update() {
    if (!this.player) return;

    this.handlePlayerMovement();
    this.checkNewChunkLoad();
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
      this.player.setFlipX(true); // Mirror sprite when moving left
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false); // Reset sprite when moving right
    } else {
      this.player.setVelocityX(0);
    }

    // if (this.cursors.up?.isDown) {
    //   this.player.setVelocityY(-speed);
    // } else if (this.cursors.down?.isDown) {
    //   this.player.setVelocityY(speed);
    // } else {
    //   this.player.setVelocityY(0);
    // }

    // Jumping
    if (this.cursors.up?.isDown && this.player.body?.blocked.down) {
      this.player.setVelocityY(-500); // Adjust jump strength as needed -330
    }
  }

  private handleCameraMovement() {
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
          // 'Power2' // Easing function
          // TODO test uncomment: 'Sine.easeInOut' // Easing function (options include 'Linear', 'Sine.easeInOut', etc.)
          'Sine.easeInOut'
        );
      }
    }
  }

  private checkPositionShift() {
    if (this.cameras.main.panEffect.isRunning) return;

    if (this.player.x >= CHUNK_SIZE) {
      // Player moved right beyond chunk size
      this.shiftPositions(-CHUNK_SIZE);
    } else if (this.player.x <= -CHUNK_SIZE) {
      // Player moved left beyond chunk size
      this.shiftPositions(CHUNK_SIZE);
    }
  }

  private shiftPositions(shiftAmount: number) {
    // Update totalShiftX
    this.totalShiftX -= shiftAmount;

    // Shift all background chunks
    this.backgroundGroup.children.each((child) => {
      (child as Phaser.GameObjects.Image).x += shiftAmount;
      return true;
    });

    // Shift the player
    this.player.x += shiftAmount;

    // // Stop any ongoing camera pan
    // this.cameras.main.panEffect.reset();
    // this.cameras.main.panEffect.destroy();

    // Shift the camera
    this.cameras.main.scrollX += shiftAmount;

    // // Adjust camera pan destination if panning
    // if (this.cameras.main.panEffect.isRunning) {
    //   console.log('Adjusting camera pan destination');
    //   this.cameras.main.panEffect.destination.x += shiftAmount;
    // }

    // DEBUG
    console.log(`Shifted by ${this.player.x > 0 ? 'right' : 'left'}`, { shiftAmount });

    // DEBUG: Shift all debug texts
    this.chunkDebugTexts.forEach((text) => {
      text.x += shiftAmount;
    });
  }

  /**
   * Calculate current chunk based on player position.
   */
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
          `Chunk ${chunkX}, ${chunkY}`,
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
        console.log(`Unloading chunk ${chunkKey}`);

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
}
