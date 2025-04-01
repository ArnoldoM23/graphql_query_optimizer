/**
 * @fileoverview
 * Tests for the main library exports.
 */
const { createSelectionObject, buildQuery, createOptimizedQuery } = require('../src');

// Simple test schema
const testSchema = `
  type Query {
    user: User
  }

  type User {
    id: ID!
    name: String!
    email: String
  }
`;

describe('createOptimizedQuery', () => {
  test('should combine createSelectionObject and buildQuery', () => {
    const query = createOptimizedQuery(testSchema, (selection) => {
      selection.user = {
        id: true,
        name: true
      };
    });
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('query { user { id name } }');
  });
  
  test('should pass options to both createSelectionObject and buildQuery', () => {
    const options = {
      includeTypename: true,
      operationType: 'query',
      operationName: 'GetUser'
    };
    
    const query = createOptimizedQuery(testSchema, (selection) => {
      selection.user = {
        id: true,
        name: true
      };
    }, options);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('query GetUser { user { id name } }');
  });
  
  test('should throw error if selectionModifier is not a function', () => {
    expect(() => {
      createOptimizedQuery(testSchema, null);
    }).toThrow('selectionModifier must be a function');
    
    expect(() => {
      createOptimizedQuery(testSchema, 'not a function');
    }).toThrow('selectionModifier must be a function');
    
    expect(() => {
      createOptimizedQuery(testSchema, {});
    }).toThrow('selectionModifier must be a function');
  });
});

describe('Library exports', () => {
  test('should export the main functions', () => {
    expect(typeof createSelectionObject).toBe('function');
    expect(typeof buildQuery).toBe('function');
    expect(typeof createOptimizedQuery).toBe('function');
  });
}); 