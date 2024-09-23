import { r } from '@/lib/formatters';
import { log } from '@/main';
import Phaser from 'phaser';
import { fetchBackground } from '../../services/BackgroundService';

// Constants
const CHUNK_SIZE = 800;
const _VIEW_WIDTH = 800; // TODO: set to 1600
const VIEW_HEIGHT = 600; // TODO: set to 1200
const VISIBLE_CHUNKS = 3; // Number of chunks to keep loaded around the player

const WORLD_BOUND_LEFT = -100000;
const WORLD_BOUND_WIDTH = 200000;
const WORLD_NAME = 'construct';

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private isMovingToTarget = false;
  private targetPosition!: Phaser.Math.Vector2;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  private backgroundGroup!: Phaser.GameObjects.Group;

  private currentChunkX = 0;
  private currentChunkY = 0;
  private isLoadingChunk = false;
  private loadedChunks = new Map<string, Phaser.GameObjects.Image>();

  // AI Service Selection
  private aiService = 'stable-diffusion'; // Default AI service
  private availableAiServices = ['dalle', 'stable-diffusion'];
  private selectedAiServiceText!: Phaser.GameObjects.Text;

  // DEBUG
  private debug = false;
  private toggleDebug: Phaser.Input.Keyboard.Key | undefined;
  private chunkDebugTexts = new Map<string, Phaser.GameObjects.Text>();
  private debugPlayerText: Phaser.GameObjects.Text | undefined;
  private debugGraphics: Phaser.GameObjects.Graphics | undefined;

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
      log.debug(`Texture loaded: ${key}`);
    });
    this.textures.on('onerror', (key: unknown) => {
      log.debug(`Texture failed to load: ${key}`);
    });
  }
  async create() {
    // Set world bounds (extend infinitely in the x-direction)
    this.physics.world.setBounds(WORLD_BOUND_LEFT, 0, WORLD_BOUND_WIDTH, VIEW_HEIGHT);
    this.cameras.main.setBounds(WORLD_BOUND_LEFT, 0, WORLD_BOUND_WIDTH, VIEW_HEIGHT);

    // Set global gravity
    this.physics.world.gravity.y = 300; // Adjust the gravity value as needed

    this.input.on('pointerdown', this.handleMouseInput, this);

    // Initialize background group
    this.backgroundGroup = this.add.group();

    // Create the player sprite after loading the background
    this.createPlayer();

    // Follow the player with the camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(400, 200);
    this.cameras.main.setZoom(1);

    // Load the initial background chunk
    await this.loadVisibleChunks(0, 0);

    // Create ground platform
    this.createGround();

    // Initialize platforms group
    this.platforms = this.physics.add.staticGroup();

    // Enable collision between player and platforms
    this.physics.add.collider(this.player, this.platforms); // Enable collision between player and platforms

    // Create AI Service selection UI
    this.createAiServiceSelectionUI();

    // DEBUG: Debug graphics on keyboard press Q
    this.physics.world.drawDebug = false;
    this.physics.world.debugGraphic.clear();
    this.toggleDebug = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // DEBUG: Draw camera deadzone
    this.debugGraphics = this.add.graphics().setScrollFactor(0).setDepth(2).setVisible(false);
    if (this.cameras.main.deadzone) {
      this.debugGraphics.lineStyle(2, 0x00ff00, 1);
      this.debugGraphics.strokeRect(
        200,
        200,
        this.cameras.main.deadzone.width,
        this.cameras.main.deadzone.height
      );
    }

    // DEBUG: Create debug text
    this.debugPlayerText = this.add
      .text(32, 32, '')
      .setScrollFactor(0)
      .setFontSize(12)
      .setColor('#00ff00')
      .setBackgroundColor('#000000')
      .setDepth(2);
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
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    } else {
      // Handle the case where keyboard input is not available
      log.error('Keyboard input is not available.');
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
    // this.handleCameraMovement();
    this.handlePlatformCreation();

    // DEBUG: Debug Graphic
    if (this.toggleDebug && Phaser.Input.Keyboard.JustDown(this.toggleDebug)) {
      this.debug = !this.debug;
      if (this.physics.world.drawDebug) {
        this.physics.world.debugGraphic.clear();
      }
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      this.debugPlayerText?.setText('');
      this.debugGraphics?.setVisible(!this.debugGraphics.visible);
    }
    // DEBUG: Camera Position
    if (this.debug) {
      const cam = this.cameras.main;
      if (this.debugPlayerText) {
        this.debugPlayerText.setText([
          `Player position: ${r(this.player.x)}, ${r(this.player.y)}`,
          ...(this.targetPosition
            ? [`Target position: ${r(this.targetPosition.x)}, ${r(this.targetPosition.y)}`]
            : []),
          'Camera ScrollX: ' + cam.scrollX,
          'Camera ScrollY: ' + cam.scrollY,
          'Camera Right:' + (cam.scrollX + cam.width),
          'Camera MidX: ' + cam.midPoint.x,
          'Camera MidY: ' + cam.midPoint.y,
          ...(cam.deadzone
            ? [
                'deadzone left: ' + cam.deadzone.left,
                'deadzone right: ' + cam.deadzone.right,
                'deadzone top: ' + cam.deadzone.top,
                'deadzone bottom: ' + cam.deadzone.bottom,
              ]
            : []),
        ]);
      }
    }
  }

  private handlePlayerMovement() {
    const speed = 200;

    // Reset horizontal velocity
    this.player.setVelocityX(0);

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true); // Mirror sprite when moving left
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false); // Reset sprite when moving right
    } else if (this.isMovingToTarget) {
      // Move towards the target position
      this.moveTowardsTarget(speed);
    }

    // Jumping
    if (this.cursors.up?.isDown && this.player.body?.blocked.down) {
      this.player.setVelocityY(-500); // Adjust jump strength as needed -330
    }
  }

  private moveTowardsTarget(speed: number) {
    const playerWorldX = this.player.x;
    const deltaX = this.targetPosition.x - playerWorldX;

    // Check if the player has reached or passed the target
    if (Math.abs(deltaX) <= 2) {
      // Stop the player
      this.player.setVelocityX(0);
      this.isMovingToTarget = false;
      return;
    }

    // Set velocity towards the target
    const direction = Math.sign(deltaX);
    this.player.setVelocityX(direction * speed);
  }

  private handleMouseInput(pointer: Phaser.Input.Pointer) {
    // Get the world coordinates of the click, considering camera scroll
    const clickX = pointer.worldX;
    const clickY = pointer.worldY;

    // Set the target position
    this.targetPosition = new Phaser.Math.Vector2(clickX, clickY);

    // Determine the direction to move
    if (clickX < this.player.x) {
      // Move left
      this.player.setFlipX(true);
    } else {
      // Move right
      this.player.setFlipX(false);
    }

    // Set movement flags
    this.isMovingToTarget = true;
  }

  private handlePlatformCreation() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.createPlatform();
    }
  }

  private createPlatform() {
    const platformWidth = 200; // Width of the platform
    const platformHeight = 20; // Height of the platform
    const offsetDistance = 200; // Distance in front of the player
    const offsetY = 0; // Height relative to the player's vertical position

    // Determine the direction the player is facing
    const direction = this.player.flipX ? -1 : 1;

    // Calculate platform position
    const x = this.player.x + direction * offsetDistance;
    const y = this.player.y + offsetY;

    // Create the rectangle representing the platform
    const platform = this.add.rectangle(
      x,
      y,
      platformWidth,
      platformHeight,
      0x8b4513 // Brown color
    );
    platform.setOrigin(0.5, 0.5); // Center the rectangle on x, y
    platform.setDepth(1); // Ensure it's above the background

    // Enable physics on the rectangle
    this.physics.add.existing(platform, true); // 'true' makes it a static body

    // Add the platform to the platforms group
    this.platforms.add(platform);
  }

  /**
   * Calculate current chunk based on player position.
   */
  private checkNewChunkLoad() {
    const playerWorldX = this.player.x;
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
      const base64DataUri = await fetchBackground(
        chunkX,
        chunkY,
        undefined,
        this.aiService,
        WORLD_NAME
      );

      // Use Phaser's Loader to load the image
      this.load.image(`chunk_${chunkKey}`, base64DataUri);

      this.load.on('loaderror', (textureKey: string) => {
        log.error(`Failed to load chunk ${chunkKey}:`, textureKey);
      });

      // Wait for the load to complete
      this.load.once('complete', () => {
        // DEBUG: Check the Loaded Texture
        // const texture = this.textures.get(`chunk_${chunkKey}`);
        // console.log(
        //   `Texture size: ${texture.getSourceImage().width}x${texture.getSourceImage().height}`,
        //   { base64DataUri, texture, isExisting: this.textures.exists(`chunk_${chunkKey}`) }
        // );

        // Calculate the position
        const chunkPositionX = chunkX * CHUNK_SIZE;

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
        const chunkText = this.add
          .text(
            chunkPositionX + 10, // Slight offset so it's visible
            10, // Y position at top
            `Chunk ${chunkX}`,
            { font: '16px Arial', color: 'black', backgroundColor: 'white' }
          )
          .setDepth(1);
        this.chunkDebugTexts.set(chunkKey, chunkText);

        this.isLoadingChunk = false;
      });

      // Start the loader
      log.debug(`🍏 ~ Loading chunk ${chunkKey}`);
      this.load.start();
    } catch (error) {
      log.error('Error loading new chunk:', error);
      // TODO: Use a fallback background or notify the player
    } finally {
      this.isLoadingChunk = false;
    }
  }

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

  private createAiServiceSelectionUI() {
    const startX = 20;
    const startY = 20;
    const spacingY = 30;

    // Display the currently selected AI service
    this.selectedAiServiceText = this.add
      .text(startX, startY, `Current AI Service: ${this.aiService}`, {
        font: '16px Arial',
        color: '#00ff00',
        backgroundColor: '#000000',
      })
      .setDepth(1)
      .setScrollFactor(0);

    this.availableAiServices.forEach((service, index) => {
      const text = this.add
        .text(startX, startY + (index + 1) * spacingY, `Use ${service}`, {
          font: '16px Arial',
          color: '#ffffff',
          backgroundColor: '#000000',
        })
        .setDepth(1)
        .setScrollFactor(0);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        this.aiService = service;
        // Update the UI to reflect the selected service
        this.updateAiServiceUI();
      });
    });
  }

  private updateAiServiceUI() {
    this.selectedAiServiceText.setText(`Current AI Service: ${this.aiService}`);
  }
}
