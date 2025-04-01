/**
 * @fileoverview
 * Demo file showcasing the GraphQL Query Optimizer library.
 */
import { 
  createSelectionObject, 
  buildQuery, 
  createOptimizedQuery, 
  SelectionObject
} from './src';

// A sample GraphQL schema with various type constructs
const schemaSDL = `
  type Query {
    user(id: ID!): User
    users: [User!]!
    search(term: String!): SearchResult
    posts: [Post!]!
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

  type User {
    id: ID!
    name: String!
    email: String
    address: Address
    posts: [Post!]
    role: Role
  }

  type Address {
    street: String
    city: String
    country: String
    postalCode: String
  }

  type Post {
    id: ID!
    title: String!
    content: String
    author: User!
    comments: [Comment!]
    tags: [String!]
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
  }

  enum Role {
    ADMIN
    USER
    GUEST
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

// Example 1: Create a selection object and manually toggle fields
// console.log('Example 1: Manual field selection');
// const selectionObject = createSelectionObject(schemaSDL);
// selectionObject.user = { id: true, name: true, email: true };
// selectionObject.posts = { id: true, title: true };

// const query1 = buildQuery(schemaSDL, selectionObject);
// console.log(query1);
// console.log();

// // Example 2: Use the convenience function to create an optimized query
// console.log('Example 2: Using createOptimizedQuery');
// const query2 = createOptimizedQuery(schemaSDL, (selection) => {
//   selection.users = { 
//     id: true, 
//     name: true, 
//     address: { 
//       city: false, 
//       country: true 
//     } 
//   };
// });
// console.log(query2);
// console.log();

// // Example 3: Interface with inline fragments
// console.log('Example 3: Interface with inline fragments');
// const interfaceSelection = createSelectionObject(schemaSDL, { includeTypename: true });
// interfaceSelection.product = {
//   __typename: true,
//   id: true,
//   name: true,
//   price: true,
//   on_PhysicalProduct: {
//     weight: true
//   },
//   on_DigitalProduct: {
//     downloadUrl: true
//   }
// };

// const query3 = buildQuery(schemaSDL, interfaceSelection);
// console.log(query3);
// console.log();

// // Example 4: Union type
// console.log('Example 4: Union type');
// const unionSelection = createSelectionObject(schemaSDL, { includeTypename: true });
// unionSelection.search = {
//   __typename: true,
//   on_User: {
//     id: false,
//     name: true
//   },
//   on_Post: {
//     id: true,
//     title: true
//   }
// };

// const query4 = buildQuery(schemaSDL, unionSelection);
// console.log(query4);
// console.log();

// // Example 5: Mutation
// console.log('Example 5: Mutation');
// const mutationSelection = createSelectionObject(schemaSDL);
// // Simulate a root mutation object
// mutationSelection.createUser = { id: true, name: true, email: true };

// const query5 = buildQuery(schemaSDL, mutationSelection, { 
//   operationType: 'mutation',
//   operationName: 'CreateNewUser'
// });
// console.log(query5); 