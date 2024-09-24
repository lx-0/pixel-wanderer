import { LAYER_DEPTHS } from '@/game/constants/GameConstants';
import { r } from '@/lib/formatters';
import { log } from '@/main';
import Phaser from 'phaser';

/**
 * Manages debugging tools, including graphics and text overlays.
 */
export class DebugManager {
  private scene: Phaser.Scene;
  private debug = false;
  private toggleDebugKey!: Phaser.Input.Keyboard.Key;
  private debugPlayerText!: Phaser.GameObjects.Text;
  private debugGraphics!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupDebugging();
  }

  /**
   * Initializes debugging tools and sets up input handling.
   */
  private setupDebugging() {
    // Disable default debug drawing
    this.scene.physics.world.drawDebug = false;
    this.scene.physics.world.debugGraphic.clear();

    // Key to toggle debug mode
    this.toggleDebugKey = this.scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.Q
    ) as Phaser.Input.Keyboard.Key;

    // Debug graphics (e.g., camera deadzone)
    this.debugGraphics = this.scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(LAYER_DEPTHS.DEBUG.GRAPHICS)
      .setVisible(false);

    if (this.scene.cameras.main.deadzone) {
      this.debugGraphics.lineStyle(2, 0x00ff00, 1);
      this.debugGraphics.strokeRect(
        200,
        200,
        this.scene.cameras.main.deadzone.width,
        this.scene.cameras.main.deadzone.height
      );
    }

    // Debug text overlay
    this.debugPlayerText = this.scene.add
      .text(20, 110, '', {
        font: '12px Arial',
        color: '#00ff00',
        backgroundColor: '#000000',
      })
      .setScrollFactor(0)
      .setDepth(LAYER_DEPTHS.DEBUG.PLAYER_TEXT);
  }

  /**
   * Updates the debug information each frame.
   * @param player - The player sprite.
   * @param targetPosition - The target position the player is moving towards, if any.
   */
  update(player: Phaser.Physics.Arcade.Sprite, targetPosition?: Phaser.Math.Vector2) {
    // Toggle debug mode on key press
    if (this.toggleDebugKey && Phaser.Input.Keyboard.JustDown(this.toggleDebugKey)) {
      this.debug = !this.debug;
      if (this.scene.physics.world.drawDebug) {
        this.scene.physics.world.debugGraphic.clear();
      }
      this.scene.physics.world.drawDebug = !this.scene.physics.world.drawDebug;
      this.debugPlayerText?.setText('');
      this.debugGraphics?.setVisible(!this.debugGraphics.visible);

      log.debug(`Debug mode ${this.debug ? 'enabled' : 'disabled'}`);
    }

    // Update debug information
    if (this.debug) {
      const cam = this.scene.cameras.main;
      this.debugPlayerText.setText([
        `Player position: ${r(player.x)}, ${r(player.y)}`,
        ...(targetPosition
          ? [`Target position: ${r(targetPosition.x)}, ${r(targetPosition.y)}`]
          : []),
        `Camera ScrollX: ${cam.scrollX}`,
        `Camera ScrollY: ${cam.scrollY}`,
        `Camera Right: ${cam.scrollX + cam.width}`,
        `Camera MidX: ${cam.midPoint.x}`,
        `Camera MidY: ${cam.midPoint.y}`,
        ...(cam.deadzone
          ? [
              `Deadzone left: ${cam.deadzone.left}`,
              `Deadzone right: ${cam.deadzone.right}`,
              `Deadzone top: ${cam.deadzone.top}`,
              `Deadzone bottom: ${cam.deadzone.bottom}`,
            ]
          : []),
      ]);
    }
  }
}
