import { LAYER_DEPTHS } from '@/game/constants/GameConstants';
import { log } from '@/main';
import Phaser from 'phaser';

/**
 * Manages platform creation and collision handling.
 */
export class PlatformManager {
  private scene: Phaser.Scene;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.platforms = this.scene.physics.add.staticGroup();

    // Listen for platform creation events from PlayerManager
    this.scene.events.on('createPlatform', this.createPlatform, this);
  }

  /**
   * Creates the ground platform at the bottom of the game world.
   */
  createGround() {
    const groundHeight = 5; // Height of the ground
    const groundY = (this.scene.game.config.height as number) - groundHeight / 2;

    const groundRectangle = this.scene.add.rectangle(
      this.scene.physics.world.bounds.left,
      groundY,
      this.scene.physics.world.bounds.width,
      groundHeight,
      0x000000
    );
    groundRectangle.setOrigin(0, 0.5); // Set origin to align correctly
    groundRectangle.setDepth(LAYER_DEPTHS.PLATFORMS);
    this.platforms.add(groundRectangle);

    log.debug('Created ground platform', {
      left: this.scene.physics.world.bounds.left,
      width: this.scene.physics.world.bounds.width,
      groundY,
      groundHeight,
      groundRectangle,
    });
  }

  // createGround2() {
  //   const groundRectangle = this.scene.add.rectangle(
  //     this.scene.physics.world.bounds.left,
  //     groundY,
  //     this.scene.physics.world.bounds.right,
  //     groundHeight,
  //     0x000000
  //   );
  // }

  /**
   * Creates a platform in front of the player.
   * @param playerX - The player's current x position.
   * @param playerY - The player's current y position.
   * @param playerFacingLeft - Whether the player is facing left.
   */
  private createPlatform(playerX: number, playerY: number, playerFacingLeft: boolean) {
    const platformWidth = 200; // Width of the platform
    const platformHeight = 20; // Height of the platform
    const offsetDistance = 200; // Distance in front of the player
    const offsetY = 0; // Height relative to the player's vertical position

    // Determine the direction to place the platform
    const direction = playerFacingLeft ? -1 : 1;

    // Calculate platform position
    const x = playerX + direction * offsetDistance;
    const y = playerY + offsetY;

    // Create the rectangle representing the platform
    const platform = this.scene.add.rectangle(
      x,
      y,
      platformWidth,
      platformHeight,
      0x8b4513 // Brown color
    );
    platform.setOrigin(0.5, 0.5); // Center the rectangle on x, y
    platform.setDepth(LAYER_DEPTHS.PLATFORMS); // Ensure it's above the background

    // Enable physics on the rectangle
    this.scene.physics.add.existing(platform, true); // 'true' makes it a static body

    // Add the platform to the platforms group
    this.platforms.add(platform);
  }

  /**
   * Returns the platforms group for collision handling.
   */
  getPlatforms() {
    return this.platforms;
  }
}
