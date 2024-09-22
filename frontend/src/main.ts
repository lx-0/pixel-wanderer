import Phaser from 'phaser';
import MainScene from '@/game/scenes/MainScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: true, // Enable debug mode
      gravity: { x: 0, y: 6000 }, // Set gravity
    },
  },
};

new Phaser.Game(config);
