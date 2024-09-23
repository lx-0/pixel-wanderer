export const supportedAiServices = ['dalle', 'stable-diffusion'] as const;

export type SupportedAiService = (typeof supportedAiServices)[number];
