/**
 * @fileoverview
 * Main entry point for the GraphQL Query Optimizer library.
 */
import { buildQuery, BuildQueryOptions } from './buildQuery';
import { createSelectionObject, SelectionObject, SelectionObjectOptions } from './createSelectionObject';

export { createSelectionObject, buildQuery };
export type { SelectionObject, SelectionObjectOptions, BuildQueryOptions };

/**
 * A function that modifies a selection object to specify which fields to include in the query.
 */
export type SelectionModifier = (selection: SelectionObject) => void;

/**
 * Creates an optimized GraphQL query based on the provided schema and selection modifier.
 * @param schemaSDL - The GraphQL schema in SDL format
 * @param selectionModifier - A function that modifies the selection object to specify which fields to include
 * @param options - Options for creating the selection object and building the query
 * @returns The generated GraphQL query string
 */
export function createOptimizedQuery(
  schemaSDL: string,
  selectionModifier: (selection: SelectionObject) => void,
  options: SelectionObjectOptions & BuildQueryOptions = {}
): string {
  if (typeof selectionModifier !== 'function') {
    throw new Error('selectionModifier must be a function');
  }
  const selection = createSelectionObject(schemaSDL, options);
  selectionModifier(selection);
  return buildQuery(schemaSDL, selection, options);
} 