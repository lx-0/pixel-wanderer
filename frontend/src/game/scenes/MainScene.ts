import { VIEW_HEIGHT } from '@/config';
import {
  AVAILABLE_AI_SERVICES,
  WORLD_BOUND_LEFT,
  WORLD_BOUND_WIDTH,
  WORLD_NAME,
} from '@/game/constants/GameConstants';
import { BackgroundManager } from '@/game/managers/BackgroundManager';
import { DebugManager } from '@/game/managers/DebugManager';
import { PlatformManager } from '@/game/managers/PlatformManager';
import { PlayerManager } from '@/game/managers/PlayerManager';
import { UIManager } from '@/game/managers/UIManager';
import { log } from '@/main';
import Phaser from 'phaser';

/**
 * The main game scene where the core gameplay takes place.
 */
export default class MainScene extends Phaser.Scene {
  private playerManager!: PlayerManager;
  private platformManager!: PlatformManager;
  private backgroundManager!: BackgroundManager;
  private uiManager!: UIManager;
  private debugManager!: DebugManager;

  private aiService = 'stable-diffusion'; // Default AI service

  constructor() {
    super('MainScene');
  }

  /**
   * Preloads assets required for the scene.
   */
  preload() {
    const assets = [{ key: 'player', path: '/assets/player.png' }];

    assets.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });

    // DEBUG: Listen to texture load events
    this.textures.on('onload', (key: unknown) => {
      log.debug(`Texture loaded: ${key}`);
    });
    this.textures.on('onerror', (key: unknown) => {
      log.error(`Texture failed to load: ${key}`);
    });
  }

  /**
   * Initializes the scene, creates game objects, and sets up managers.
   */
  async create() {
    // Set world bounds
    this.physics.world.setBounds(WORLD_BOUND_LEFT, 0, WORLD_BOUND_WIDTH, VIEW_HEIGHT);
    this.cameras.main.setBounds(WORLD_BOUND_LEFT, 0, WORLD_BOUND_WIDTH, VIEW_HEIGHT);

    // Set global gravity
    this.physics.world.gravity.y = 300; // Adjust the gravity value as needed

    // Initialize managers
    this.playerManager = new PlayerManager(this);
    this.platformManager = new PlatformManager(this);
    this.backgroundManager = new BackgroundManager(this, this.aiService);
    this.uiManager = new UIManager(
      this,
      this.aiService,
      AVAILABLE_AI_SERVICES,
      WORLD_NAME,
      (newService) => {
        this.aiService = newService;
        this.backgroundManager.setAiService(newService);
      }
    );
    this.debugManager = new DebugManager(this);

    // Create game objects
    this.playerManager.createPlayer();
    this.platformManager.createGround();

    // Enable collision between player and platforms
    this.physics.add.collider(this.playerManager.player, this.platformManager.getPlatforms());

    // Follow the player with the camera
    this.cameras.main.startFollow(this.playerManager.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(400, 200);
    this.cameras.main.setZoom(1);

    // Create UI elements
    this.uiManager.createUI();

    // Load the initial background chunks
    await this.backgroundManager.loadInitialChunks();
  }

  /**
   * Main update loop, called once per frame.
   */
  update() {
    this.playerManager.update();
    this.backgroundManager.update(this.playerManager.player.x);
    this.debugManager.update(this.playerManager.player, this.playerManager['targetPosition']);
  }
}
