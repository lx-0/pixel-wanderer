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
    },
  },
};

new Phaser.Game(config);
