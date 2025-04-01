# GraphQL Query Optimizer

[![npm version](https://img.shields.io/npm/v/graphql-query-optimizer.svg)](https://www.npmjs.com/package/graphql-query-optimizer)
[![Build Status](https://github.com/ArnoldoM23/graphql_query_optimizer/actions/workflows/test.yml/badge.svg)](https://github.com/ArnoldoM23/graphql_query_optimizer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ArnoldoM23/graphql_query_optimizer/blob/main/CONTRIBUTING.md)

A TypeScript library that helps GraphQL clients create optimized queries with only the necessary fields.

## Features

- Parses GraphQL schemas (SDL)
- Generates a nested selection object with the same shape as the schema (fields default to `false`)
- Allows users to toggle fields to `true` to include them in the query
- Builds a valid GraphQL query string from the selection object
- Supports all GraphQL type constructs (scalars, objects, interfaces, unions, lists, enums)
- TypeScript support with full type definitions

## Installation

```bash
npm install graphql-query-optimizer
```

## Usage

### Basic Example

```typescript
import { createSelectionObject, buildQuery } from 'graphql-query-optimizer';

// Your GraphQL schema
const schema = `
  type Query {
    user: User
    posts: [Post!]!
  }

  type User {
    id: ID!
    name: String
    email: String
  }

  type Post {
    id: ID!
    title: String
    content: String
  }
`;

// Create a selection object with all fields set to false
const selection = createSelectionObject(schema);

// Toggle the fields you want to include
selection.user.id = true;
selection.user.name = true;
selection.posts.title = true;

// Build the optimized query
const query = buildQuery(schema, selection);
console.log(query);
// Output: query { user { id name } posts { title } }
```

### Advanced Example with Interfaces, Unions and Mutations

```typescript
import { createSelectionObject, buildQuery, createOptimizedQuery, SelectionObject } from 'graphql-query-optimizer';

// Schema with interfaces and unions
const schema = `
  type Query {
    node(id: ID!): Node
    search(term: String!): SearchResult
  }

  type Mutation {
    createUser(input: UserInput!): User
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
  }

  type Post implements Node {
    id: ID!
    title: String!
    content: String
  }

  union SearchResult = User | Post
`;

// Create selection with __typename field
const selection = createSelectionObject(schema, { includeTypename: true });

// Select fields for interface
selection.node.__typename = true;
selection.node.id = true;
selection.node.on_User = {
  name: true
};
selection.node.on_Post = {
  title: true
};

// Select fields for union
selection.search.__typename = true;
selection.search.on_User = {
  id: true,
  name: true
};
selection.search.on_Post = {
  id: true,
  title: true
};

// Build a query
const query = buildQuery(schema, selection);
console.log(query);
/* Output:
query {
  node {
    __typename id ... on User { name } ... on Post { title }
  }
  search {
    __typename ... on User { id name } ... on Post { id title }
  }
}
*/

// Create a mutation
const mutationSelection = createSelectionObject(schema);
mutationSelection.createUser = {
  id: true,
  name: true,
  email: true
};

const mutation = buildQuery(schema, mutationSelection, { 
  operationType: 'mutation',
  operationName: 'CreateNewUser'
});
console.log(mutation);
/* Output:
mutation CreateNewUser {
  createUser { id name email }
}
*/
```

### Convenience Function

Use the `createOptimizedQuery` function to simplify the process:

```typescript
import { createOptimizedQuery } from 'graphql-query-optimizer';

const schema = `
  type Query {
    user: User
  }

  type User {
    id: ID!
    name: String!
    email: String
  }
`;

// Create and build a query in one step
const query = createOptimizedQuery(schema, (selection) => {
  selection.user = {
    id: true,
    name: true
  };
}, { operationName: 'GetUser' });

console.log(query);
// Output: query GetUser { user { id name } }
```

## API Reference

### `createSelectionObject(schemaSDL, options = { includeTypename: false })`

Creates a selection object from a GraphQL schema.

- **Parameters:**
  - `schemaSDL` (String): A GraphQL schema in SDL format
  - `options` (Object): Configuration options
    - `includeTypename` (Boolean): Whether to include `__typename` field for interfaces and unions
- **Returns:** A nested object with the same shape as the schema, with all fields initialized to `false`

### `buildQuery(schemaSDL, selectionObject, options = {})`

Builds a GraphQL query string from a selection object.

- **Parameters:**
  - `schemaSDL` (String): A GraphQL schema in SDL format
  - `selectionObject` (Object): A selection object with fields toggled to `true` or `false`
  - `options` (Object): Configuration options
    - `operationType` (String): The operation type ('query', 'mutation', 'subscription')
    - `operationName` (String): The name of the operation
- **Returns:** A valid GraphQL query string

### `createOptimizedQuery(schemaSDL, selectionModifier, options = {})`

Convenience function that combines `createSelectionObject` and `buildQuery`.

- **Parameters:**
  - `schemaSDL` (String): A GraphQL schema in SDL format
  - `selectionModifier` (Function): A function that modifies the selection object
  - `options` (Object): Configuration options (same as above)
- **Returns:** A valid GraphQL query string

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Versioning

This project follows [Semantic Versioning](https://semver.org/) (SemVer) for versioning. For the versions available, see the [tags on this repository](https://github.com/ArnoldoM23/graphql_query_optimizer/tags).

### Release Process

1. The project uses automated versioning through GitHub Actions
2. When a pull request is merged to the main branch:
   - The patch version is automatically incremented
   - A new tag is created and pushed to the repository
   - The tag format follows the pattern `vX.Y.Z` where:
     - X is the major version (breaking changes)
     - Y is the minor version (new features, non-breaking)
     - Z is the patch version (bug fixes, non-breaking)

### Manual Tagging

For major or minor version updates, you can manually create and push a tag:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Testing

```bash
npm test
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run demo
npm start
```

## License

[MIT](LICENSE) 