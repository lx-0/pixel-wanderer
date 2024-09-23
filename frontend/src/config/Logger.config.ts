import { LoggerConfig } from '@/lib/Logger';

export const LOGGER_CONFIG: Partial<LoggerConfig> = {
  debugContexts: new Set(['**', '!Logger']),
};
