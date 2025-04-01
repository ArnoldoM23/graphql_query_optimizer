/**
 * @fileoverview
 * Main entry point for the GraphQL Query Optimizer library.
 */
const createSelectionObject = require('./createSelectionObject');
const { buildQuery } = require('./buildQuery');

/**
 * Creates a selection object from a GraphQL schema and builds a query.
 * This is a convenience method that combines createSelectionObject and buildQuery.
 *
 * @param {String} schemaSDL - A string containing a valid GraphQL schema (SDL).
 * @param {Function} selectionModifier - A function that modifies the selection object.
 * @param {Object} options - Options for customizing the selection object and query generation.
 * @return {String} A valid GraphQL query string.
 * @throws {Error} If schemaSDL is invalid or selectionModifier is not a function.
 */
function createOptimizedQuery(schemaSDL, selectionModifier, options = {}) {
  if (typeof selectionModifier !== 'function') {
    throw new Error('selectionModifier must be a function');
  }
  
  const selection = createSelectionObject(schemaSDL, options);
  
  // Allow the user to modify the selection object
  selectionModifier(selection);
  
  // Build the query with the modified selection
  return buildQuery(schemaSDL, selection, options);
}

module.exports = {
  createSelectionObject,
  buildQuery,
  createOptimizedQuery
}; 