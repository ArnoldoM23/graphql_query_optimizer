/**
 * @fileoverview
 * Main entry point for the GraphQL Query Optimizer library.
 */
import { buildQuery } from './buildQuery';
import { createSelectionObject, SelectionObject, SelectionObjectOptions } from './createSelectionObject';

/**
 * Type for selection modifier function
 */
export type SelectionModifier = (selection: SelectionObject) => void;

/**
 * Creates an optimized GraphQL query by allowing you to specify which fields to include.
 * 
 * @param schemaSDL - A string containing a valid GraphQL schema (SDL).
 * @param selectionModifier - A function that modifies the selection object.
 * @param options - Options for customizing the query generation.
 * @returns A valid GraphQL query string.
 */
export function createOptimizedQuery(
  schemaSDL: string,
  selectionModifier: (selection: SelectionObject) => void,
  options: SelectionObjectOptions = {}
): string {
  const selection = createSelectionObject(schemaSDL, options);
  selectionModifier(selection);
  return buildQuery(schemaSDL, selection);
}

export { createSelectionObject, buildQuery, SelectionObject, SelectionObjectOptions }; 