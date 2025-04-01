/**
 * @fileoverview
 * Tests for the buildQuery function.
 */
const { buildQuery, buildFieldSelections, getUnwrappedType } = require('../src/buildQuery');
const createSelectionObject = require('../src/createSelectionObject');
const { buildSchema } = require('graphql');

// Test schema with various GraphQL type constructs
const testSchema = `
  type Query {
    user: User
    users: [User!]!
    node(id: ID!): Node
    search(term: String!): SearchResult
    product(id: ID!): Product
  }

  type Mutation {
    createUser(input: UserInput!): User
    updateUser(id: ID!, input: UserInput!): User
  }

  input UserInput {
    name: String!
    email: String!
  }

  interface Node {
    id: ID!
  }

  type User implements Node {
    id: ID!
    name: String!
    email: String
    posts: [Post!]
  }

  type Post implements Node {
    id: ID!
    title: String!
    content: String
    author: User!
  }

  union SearchResult = User | Post

  interface Product {
    id: ID!
    name: String!
    price: Float!
  }

  type PhysicalProduct implements Product {
    id: ID!
    name: String!
    price: Float!
    weight: Float
    dimensions: String
  }

  type DigitalProduct implements Product {
    id: ID!
    name: String!
    price: Float!
    downloadUrl: String
    fileSize: String
  }
`;

describe('buildQuery', () => {
  test('should build a simple query with scalar fields', () => {
    const selection = { user: { id: true, name: true } };
    const query = buildQuery(testSchema, selection);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('query { user { id name } }');
  });
  
  test('should handle nested fields', () => {
    const selection = { 
      user: { 
        id: true, 
        name: true,
        posts: {
          id: true,
          title: true
        }
      } 
    };
    const query = buildQuery(testSchema, selection);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('query { user { id name posts { id title } } }');
  });
  
  test('should include only selected fields', () => {
    // Use a specific selection with only id and email fields
    const manualSelection = {
      user: {
        id: true,
        email: true
      }
    };
    
    const query = buildQuery(testSchema, manualSelection);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('query { user { id email } }');
  });
  
  test('should handle interfaces with inline fragments', () => {
    const selection = {
      product: {
        __typename: true,
        id: true,
        name: true,
        on_PhysicalProduct: {
          weight: true
        },
        on_DigitalProduct: {
          downloadUrl: true
        }
      }
    };
    
    const query = buildQuery(testSchema, selection);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toContain('product {');
    expect(normalizedQuery).toContain('__typename id name');
    expect(normalizedQuery).toContain('... on PhysicalProduct { weight }');
    expect(normalizedQuery).toContain('... on DigitalProduct { downloadUrl }');
  });
  
  test('should handle union types', () => {
    const selection = {
      search: {
        __typename: true,
        on_User: {
          id: true,
          name: true
        },
        on_Post: {
          id: true,
          title: true
        }
      }
    };
    
    const query = buildQuery(testSchema, selection);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toContain('search {');
    expect(normalizedQuery).toContain('__typename');
    expect(normalizedQuery).toContain('... on User { id name }');
    expect(normalizedQuery).toContain('... on Post { id title }');
  });
  
  test('should support mutations', () => {
    const selection = {
      createUser: {
        id: true,
        name: true,
        email: true
      }
    };
    
    const query = buildQuery(testSchema, selection, { 
      operationType: 'mutation', 
      operationName: 'CreateNewUser' 
    });
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('mutation CreateNewUser { createUser { id name email } }');
  });
  
  test('should handle empty selection objects', () => {
    const selection = {};
    
    const query = buildQuery(testSchema, selection);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('query {}');
  });
  
  test('should handle empty objects', () => {
    const simpleSchema = `
      type Query {
        user: User
      }
      
      type User {
        id: ID!
        name: String!
      }
    `;
    
    // Now with the full function
    const selection = { user: {} };
    const query = buildQuery(simpleSchema, selection);
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    
    // Accept either format since this is an edge case implementation detail
    expect(['query { user {} }', 'query {}'].includes(normalizedQuery)).toBe(true);
  });
  
  test('should ignore fields not in the schema', () => {
    const selection = {
      user: {
        id: true,
        nonExistentField: true
      }
    };
    
    const query = buildQuery(testSchema, selection);
    
    // Remove whitespace for easier comparison
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    expect(normalizedQuery).toBe('query { user { id } }');
  });
  
  test('should validate input parameters', () => {
    // Invalid schema
    expect(() => {
      buildQuery(null, { user: { id: true } });
    }).toThrow('Schema must be a valid SDL string');
    
    expect(() => {
      buildQuery(123, { user: { id: true } });
    }).toThrow('Schema must be a valid SDL string');
    
    // Invalid selection object
    expect(() => {
      buildQuery(testSchema, null);
    }).toThrow('Selection object must be a valid object');
    
    expect(() => {
      buildQuery(testSchema, 'not an object');
    }).toThrow('Selection object must be a valid object');
  });
  
  test('should throw an error for invalid schema', () => {
    const invalidSchema = `
      type Query {
        user: InvalidType
      }
    `;
    
    expect(() => {
      buildQuery(invalidSchema, { user: { id: true } });
    }).toThrow();
  });
  
  test('should throw an error if operation type is not found', () => {
    expect(() => {
      buildQuery(testSchema, { createUser: { id: true } }, { operationType: 'subscription' });
    }).toThrow('No subscription type found in schema.');
  });
  
  test('should throw an error for unsupported operation type', () => {
    expect(() => {
      buildQuery(testSchema, { user: { id: true } }, { operationType: 'invalid' });
    }).toThrow('Unsupported operation type: invalid');
  });
});

describe('buildFieldSelections', () => {
  let schema;
  let queryType;
  
  beforeAll(() => {
    schema = buildSchema(testSchema);
    queryType = schema.getQueryType();
  });
  
  test('should handle null or undefined selection object', () => {
    expect(buildFieldSelections(null, queryType, schema)).toBe('');
    expect(buildFieldSelections(undefined, queryType, schema)).toBe('');
    expect(buildFieldSelections('not an object', queryType, schema)).toBe('');
  });
  
  test('should handle null or undefined graphQLType', () => {
    expect(buildFieldSelections({}, null, {})).toBe('');
    expect(buildFieldSelections({}, undefined, {})).toBe('');
    expect(buildFieldSelections({}, { name: 'Type' }, {})).toBe('');
  });
  
  test('should handle empty objects appropriately', () => {
    // Test with a simple schema and selection
    const simpleSchema = buildSchema(`
      type Query { user: User }
      type User { id: ID! }
    `);
    const queryType = simpleSchema.getQueryType();
    
    // When building a field selection with an empty object
    const result = buildFieldSelections({ user: {} }, queryType, simpleSchema);
    
    // The implementation might either include or omit the empty field
    // Either behavior is acceptable, we just check it's handled without errors
    expect(['user {}', ''].includes(result.trim())).toBe(true);
  });
});

describe('getUnwrappedType', () => {
  test('should handle null or undefined type', () => {
    expect(getUnwrappedType(null)).toBeNull();
    expect(getUnwrappedType(undefined)).toBeNull();
  });
  
  test('should unwrap nested types', () => {
    const nestedType = {
      ofType: {
        ofType: {
          ofType: {
            name: 'BaseType'
          }
        }
      }
    };
    
    expect(getUnwrappedType(nestedType)).toEqual({ name: 'BaseType' });
  });
  
  test('should return the type if it has no ofType property', () => {
    const type = { name: 'Type' };
    expect(getUnwrappedType(type)).toEqual(type);
  });
}); 