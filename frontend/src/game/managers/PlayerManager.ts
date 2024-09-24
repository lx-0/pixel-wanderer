import { LAYER_DEPTHS } from '@/game/constants/GameConstants';
import { log } from '@/main';
import Phaser from 'phaser';

/**
 * Manages the player character, including creation, movement, and input handling.
 */
export class PlayerManager {
  private scene: Phaser.Scene;
  public player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private isMovingToTarget = false;
  private targetPosition!: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Creates the player sprite and initializes input handling.
   */
  createPlayer() {
    // Create the player sprite at the center of the camera view
    const initialPlayerX = this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2;
    this.player = this.scene.physics.add.sprite(initialPlayerX, 300, 'player');

    // Player settings
    this.player.setCollideWorldBounds(false); // Allow movement beyond world bounds
    this.player.setScale(0.5); // Adjust the player's size
    this.player.setDepth(LAYER_DEPTHS.PLAYER); // Ensure the player is drawn above the backgrounds
    this.player.setBounce(0); // No bounce on landing
    this.player.setGravityY(300); // Apply gravity to the player

    // Create cursor keys for movement
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    } else {
      // Handle the case where keyboard input is not available
      log.error('Keyboard input is not available.');
    }

    // Handle mouse input for movement
    this.scene.input.on('pointerdown', this.handleMouseInput, this);
  }

  /**
   * Updates the player each frame.
   */
  update() {
    if (!this.player) return;

    this.handlePlayerMovement();
    this.handlePlatformCreation();
  }

  /**
   * Handles player movement based on keyboard input and target positions.
   */
  private handlePlayerMovement() {
    const speed = 200;

    // Reset horizontal velocity
    this.player.setVelocityX(0);

    if (this.cursors.left?.isDown) {
      // Move left
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true); // Mirror sprite when moving left
    } else if (this.cursors.right?.isDown) {
      // Move right
      this.player.setVelocityX(speed);
      this.player.setFlipX(false); // Reset sprite when moving right
    } else if (this.isMovingToTarget) {
      // Move towards the target position
      this.moveTowardsTarget(speed);
    }

    // Jumping
    if (this.cursors.up?.isDown && this.player.body?.blocked.down) {
      this.player.setVelocityY(-500); // Adjust jump strength as needed
    }
  }

  /**
   * Moves the player towards the target position when the user clicks.
   * @param speed - The speed at which the player moves.
   */
  private moveTowardsTarget(speed: number) {
    const deltaX = this.targetPosition.x - this.player.x;

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

  /**
   * Handles mouse input for setting a target position for the player to move towards.
   * @param pointer - The pointer event from Phaser.
   */
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

  /**
   * Handles platform creation when the space key is pressed.
   */
  private handlePlatformCreation() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      // Notify PlatformManager to create a platform
      this.scene.events.emit('createPlatform', this.player.x, this.player.y, this.player.flipX);
    }
  }
}
