import { LoggerConfig } from '../utils/Logger';

export const LOGGER_CONFIG: Partial<LoggerConfig> = {
  debugContexts: new Set(['**', '!Logger']),
};
