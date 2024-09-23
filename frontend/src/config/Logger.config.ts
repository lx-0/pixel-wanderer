import { LoggerConfig } from '@/lib/Logger';

export const LOGGER_CONFIG: Partial<LoggerConfig> = {
  // defaultContext: 'App',
  debugContexts: new Set(['**', '!Logger']),
};
