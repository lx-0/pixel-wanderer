import { VIEW_WIDTH } from '@/config';
import { LAYER_DEPTHS } from '@/game/constants/GameConstants';
import Phaser from 'phaser';

/**
 * Manages the User Interface elements, including AI service selection and world info display.
 */
export class UIManager {
  private scene: Phaser.Scene;
  private uiTexts = new Map<string, Phaser.GameObjects.Text>();
  private aiService: string;
  private aiServiceChangedCallback: (newService: string) => void;
  private availableAiServices: string[];
  private worldName: string;

  constructor(
    scene: Phaser.Scene,
    aiService: string,
    availableAiServices: string[],
    worldName: string,
    aiServiceChangedCallback: (newService: string) => void
  ) {
    this.scene = scene;
    this.aiService = aiService;
    this.availableAiServices = availableAiServices;
    this.worldName = worldName;
    this.aiServiceChangedCallback = aiServiceChangedCallback;
  }

  /**
   * Initializes the UI elements.
   */
  createUI() {
    this.createAiServiceSelectionUI();
    this.createWorldInfoLabel();
  }

  /**
   * Creates a label displaying the current world name.
   */
  private createWorldInfoLabel() {
    const worldInfoLabel = this.scene.add
      .text(VIEW_WIDTH - 20, 20, `${this.worldName}`, {
        font: '16px Arial',
        color: '#ffffff',
        backgroundColor: '#000000',
      })
      .setDepth(LAYER_DEPTHS.UI)
      .setScrollFactor(0)
      .setOrigin(1, 0); // Align to the right
    this.uiTexts.set('worldInfoLabel', worldInfoLabel);
  }

  /**
   * Creates the UI for AI service selection.
   */
  private createAiServiceSelectionUI() {
    const startX = 20;
    const startY = 20;
    const spacingY = 30;

    // Display the currently selected AI service
    const selectedAiServiceText = this.scene.add
      .text(startX, startY, `Current AI Service: ${this.aiService}`, {
        font: '16px Arial',
        color: '#00ff00',
        backgroundColor: '#000000',
      })
      .setDepth(LAYER_DEPTHS.UI)
      .setScrollFactor(0);
    this.uiTexts.set('selectedAiServiceText', selectedAiServiceText);

    this.availableAiServices.forEach((service, index) => {
      const aiServiceSelectionText = this.scene.add
        .text(startX, startY + (index + 1) * spacingY, `Use ${service}`, {
          font: '16px Arial',
          color: '#ffffff',
          backgroundColor: '#000000',
        })
        .setDepth(LAYER_DEPTHS.UI)
        .setScrollFactor(0);
      aiServiceSelectionText.setInteractive({ useHandCursor: true });
      aiServiceSelectionText.on('pointerdown', () => {
        this.aiService = service;
        this.updateAiServiceUI(); // Update the UI to reflect the selected service
        this.aiServiceChangedCallback(service);
      });
      this.uiTexts.set(`aiServiceSelectionText_${service}`, aiServiceSelectionText);
    });
  }

  /**
   * Updates the UI to reflect the currently selected AI service.
   */
  private updateAiServiceUI() {
    this.uiTexts.get('selectedAiServiceText')?.setText(`Current AI Service: ${this.aiService}`);
  }
}
