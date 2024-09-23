export interface Metadata {
  prompt: string;
  createdAt: string;
  coordinates: {
    x: number;
    y: number;
  };
  userPrompt?: string;
  service: string;
  mode: 'text-to-image' | 'image-to-image';
}
