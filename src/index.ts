/**
 * @fileoverview
 * Main entry point for the GraphQL Query Optimizer library.
 */
import createSelectionObject, { SelectionObject, SelectionObjectOptions } from './createSelectionObject';
import { buildQuery, BuildQueryOptions } from './buildQuery';

/**
 * Type for selection modifier function
 */
export type SelectionModifier = (selection: SelectionObject) => void;

/**
 * Creates a selection object from a GraphQL schema and builds a query.
 * This is a convenience method that combines createSelectionObject and buildQuery.
 *
 * @param schemaSDL - A string containing a valid GraphQL schema (SDL).
 * @param selectionModifier - A function that modifies the selection object.
 * @param options - Options for customizing the selection object and query generation.
 * @return A valid GraphQL query string.
 * @throws {Error} If schemaSDL is invalid or selectionModifier is not a function.
 */
function createOptimizedQuery(
  schemaSDL: string,
  selectionModifier: SelectionModifier,
  options: SelectionObjectOptions & BuildQueryOptions = {}
): string {
  if (typeof selectionModifier !== 'function') {
    throw new Error('selectionModifier must be a function');
  }
  
  const selection = createSelectionObject(schemaSDL, options);
  
  // Allow the user to modify the selection object
  selectionModifier(selection);
  
  // Build the query with the modified selection
  return buildQuery(schemaSDL, selection, options);
}

export {
  createSelectionObject,
  buildQuery,
  createOptimizedQuery,
  SelectionObject,
  SelectionObjectOptions,
  BuildQueryOptions
}; 