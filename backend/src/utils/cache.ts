import NodeCache from 'node-cache';

export const cache = new NodeCache({ stdTTL: 3600 }); // Cache TTL of 1 hour
