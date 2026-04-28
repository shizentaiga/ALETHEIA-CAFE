/**
 * [File Path] src/db/queries/main.ts
 */
import { fetchServices } from './search';
import { formatAttributes } from './transformers';

export const dbQueries = {
  fetchServices,
  formatAttributes,
};

export { fetchServices, formatAttributes };