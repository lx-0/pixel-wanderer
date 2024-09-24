import { LOGGER_CONFIG, VIEW_HEIGHT, VIEW_WIDTH } from '@/config';
import MainScene from '@/game/scenes/MainScene';
import { Logger } from '@/lib/Logger';
import Phaser from 'phaser';

export const log = new Logger(LOGGER_CONFIG);

export const PHASER_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: true, // Enable debug mode
    },
  },
};

new Phaser.Game(PHASER_CONFIG);
