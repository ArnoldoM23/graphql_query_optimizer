# Project Guidelines: GraphQL Dynamic Query Builder

This document outlines the core requirements for a JavaScript library that:

1. **Reads** a GraphQL schema (SDL).
2. **Generates** a nested “selection” object with the same shape as the schema, where each field defaults to `false`.
3. **Allows** users to toggle fields to `true` to indicate which fields to include in a query.
4. **Builds** a valid GraphQL query string (or multiple queries) from that “selection” object, including handling all GraphQL type constructs (scalars, objects, interfaces, unions, lists, enums, etc.).

---

## 1. Parsing the Schema

- The library must **parse** a user-provided GraphQL schema in SDL (Schema Definition Language) format.
  - Use [`graphql`](https://www.npmjs.com/package/graphql) (the official reference implementation) or a compatible library.
  - **Required**: Safely handle parsing errors and produce meaningful error messages if the schema is invalid.

- After parsing, the library should have access to:
  - **Root operation types**: Query, Mutation, Subscription (if present).
  - **All types**: objects, interfaces, unions, enums, scalars, input objects.
  - **Fields**, including their argument definitions, and sub-fields.

---

## 2. Creating a “False” Selection Object

The library should generate a nested JavaScript object where **each field** in the schema is represented, but initialized to `false`. This should happen **recursively** for all nested fields. Specifically:

### 2.1 Object and Scalar Fields

- For **object** fields:
  - Create a nested object that mirrors the field’s sub-fields, each set to `false`.
- For **scalar** or **enum** fields:
  - Simply store `false`.

### 2.2 Interfaces

- If a field’s type is an **interface**, each implementing type must also be discoverable.
- The selection object could store:
  ```js
  {
    interfaceField: {
      __typename: false, // Optional if you want to track the typename
      // subfields for the interface...
      // also handle inline fragments for each concrete implementation
      on_ImplementationA: {
        // fields specific to ImplementationA
      },
      on_ImplementationB: {
        // fields specific to ImplementationB
      }
    }
  }