import { LOGGER_CONFIG } from '@/config';
import MainScene from '@/game/scenes/MainScene';
import { Logger } from '@/lib/Logger';
import Phaser from 'phaser';

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

export const log = new Logger(LOGGER_CONFIG);

new Phaser.Game(config);
