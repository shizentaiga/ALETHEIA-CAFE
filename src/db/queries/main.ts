/**
 * [File Path] src/db/queries/main.ts
 * [Role] Integrated entry point for the query layer.
 * [Notes] External layers (API, etc.) interact with the DB through this file.
 */

import { fetchServices } from './searchQuery';
import { formatAttributes } from './transformers';
import * as areaQueries from './areaQuery';

/**
 * Providing dbQueries as an object.
 * Enables namespaced access such as `dbQueries.fetchServices` or `dbQueries.getSubAreas`.
 */
export const dbQueries = {
  fetchServices,
  formatAttributes,
  ...areaQueries, // areaQuery.ts 内の全ての関数を展開して統合
};

/**
 * Providing named exports.
 * Enables direct imports such as `import { fetchServices, getSubAreas } from './main'`.
 */
export { fetchServices, formatAttributes };
export * from './areaQuery';