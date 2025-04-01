/**
 * @fileoverview
 * Creates a selection object from a GraphQL schema.
 * The selection object has the same shape as the schema, with all fields initialized to false.
 */
const { buildSchema } = require('graphql');

/**
 * Recursively constructs an object with the same shape as the schema,
 * initializing every field to false.
 *
 * @param {String} schemaSDL - A string containing a valid GraphQL schema (SDL).
 * @param {Object} options - Options for customizing the selection object generation.
 * @param {Boolean} options.includeTypename - Whether to include __typename field for interfaces and unions.
 * @return {Object} A nested object corresponding to the query type.
 */
function createSelectionObject(schemaSDL, options = { includeTypename: false }) {
  // Parse/Build schema
  const schema = buildSchema(schemaSDL);

  // Retrieve the root Query type (assuming it exists)
  const queryType = schema.getQueryType();
  if (!queryType) {
    throw new Error('No query type found in schema.');
  }

  // Track visited types to prevent infinite recursion
  const visitedTypes = new Set();
  
  // Build the nested "all false" object for Query
  return recurseFields(queryType, schema, options, visitedTypes);
}

/**
 * Recursively processes fields of a GraphQL type to build a selection object.
 * 
 * @param {Object} graphQLType - The GraphQL type to process.
 * @param {Object} schema - The complete GraphQL schema.
 * @param {Object} options - Options for customizing the selection object generation.
 * @param {Set} visitedTypes - Set of already visited types to avoid circular references.
 * @return {Object} A nested object representing the type's fields.
 * @private
 */
function recurseFields(graphQLType, schema, options, visitedTypes = new Set()) {
  // Handle null or undefined graphQLType
  if (!graphQLType || !graphQLType.name) {
    return {};
  }
  
  const typeName = graphQLType.name;
  const result = {};
  
  // If we've already visited this type in the current branch, return basic fields to avoid recursion
  if (visitedTypes.has(typeName)) {
    // For already visited types, we still return basic fields but don't recurse further
    if (graphQLType.getFields) {
      const fields = graphQLType.getFields();
      Object.keys(fields).forEach(fieldName => {
        result[fieldName] = false;
      });
    }
    return result;
  }
  
  // Add this type to visited set
  visitedTypes.add(typeName);
  
  // Handle types without getFields method
  if (!graphQLType.getFields) {
    return result;
  }
  
  try {
    const fields = graphQLType.getFields();
    
    // Loop over each field on this type
    Object.keys(fields).forEach((fieldName) => {
      const field = fields[fieldName];
      
      // Handle undefined field type
      if (!field || !field.type) {
        result[fieldName] = false;
        return;
      }
      
      let fieldType = field.type;
  
      // Unwrap nested NonNull/List types to get to the underlying type
      while (fieldType.ofType) {
        fieldType = fieldType.ofType;
      }
  
      // Handle various field types
      if (fieldType.getFields) {
        // Object type with subfields
        // Create a new visited set for each branch to allow the same type to appear in different branches
        const newVisitedTypes = new Set(visitedTypes);
        result[fieldName] = recurseFields(fieldType, schema, options, newVisitedTypes);
      } else if (isInterfaceType(fieldType)) {
        // Interface type
        result[fieldName] = handleInterface(fieldType, schema, options, new Set(visitedTypes));
      } else if (isUnionType(fieldType)) {
        // Union type
        result[fieldName] = handleUnion(fieldType, schema, options, new Set(visitedTypes));
      } else {
        // Scalar/enum type
        result[fieldName] = false;
      }
    });
  } catch (error) {
    // If there's an error processing fields, just return an empty object
    // This is just a safety measure for malformed schemas
  }

  return result;
}

/**
 * Checks if a GraphQL type is an interface type.
 * 
 * @param {Object} type - The GraphQL type to check.
 * @return {Boolean} True if the type is an interface type.
 * @private
 */
function isInterfaceType(type) {
  return type && type.astNode && type.astNode.kind === 'InterfaceTypeDefinition';
}

/**
 * Checks if a GraphQL type is a union type.
 * 
 * @param {Object} type - The GraphQL type to check.
 * @return {Boolean} True if the type is a union type.
 * @private
 */
function isUnionType(type) {
  return type && type.astNode && type.astNode.kind === 'UnionTypeDefinition';
}

/**
 * Processes interface types to include their fields and possible implementations.
 * 
 * @param {Object} interfaceType - The GraphQL interface type.
 * @param {Object} schema - The complete GraphQL schema.
 * @param {Object} options - Options for customizing the selection object generation.
 * @param {Set} visitedTypes - Set of already visited types to avoid circular references.
 * @return {Object} A nested object representing the interface.
 * @private
 */
function handleInterface(interfaceType, schema, options, visitedTypes = new Set()) {
  const result = {};
  
  // Include __typename if specified in options
  if (options.includeTypename) {
    result.__typename = false;
  }
  
  // Add interface fields
  if (interfaceType.getFields) {
    const interfaceFields = interfaceType.getFields();
    Object.keys(interfaceFields).forEach(fieldName => {
      const field = interfaceFields[fieldName];
      if (!field || !field.type) {
        result[fieldName] = false;
        return;
      }
      
      let fieldType = field.type;
      
      // Unwrap nested NonNull/List types
      while (fieldType.ofType) {
        fieldType = fieldType.ofType;
      }
      
      // Recurse for object types, otherwise set to false
      if (fieldType.getFields) {
        const newVisitedTypes = new Set(visitedTypes);
        result[fieldName] = recurseFields(fieldType, schema, options, newVisitedTypes);
      } else {
        result[fieldName] = false;
      }
    });
  }
  
  // Add implementations as inline fragments
  try {
    if (schema.getPossibleTypes) {
      const implementations = schema.getPossibleTypes(interfaceType);
      if (implementations && implementations.length > 0) {
        implementations.forEach(implType => {
          const implTypeName = implType.name;
          // Create a new visited set for each implementation
          const newVisitedTypes = new Set(visitedTypes);
          result[`on_${implTypeName}`] = recurseFields(implType, schema, options, newVisitedTypes);
        });
      }
    }
  } catch (error) {
    // If there's an error getting possible types, just continue
    // This can happen in test scenarios with mock schemas
  }
  
  return result;
}

/**
 * Processes union types to include their possible types.
 * 
 * @param {Object} unionType - The GraphQL union type.
 * @param {Object} schema - The complete GraphQL schema.
 * @param {Object} options - Options for customizing the selection object generation.
 * @param {Set} visitedTypes - Set of already visited types to avoid circular references.
 * @return {Object} A nested object representing the union.
 * @private
 */
function handleUnion(unionType, schema, options, visitedTypes = new Set()) {
  const result = {};
  
  // Include __typename if specified in options
  if (options.includeTypename) {
    result.__typename = false;
  }
  
  // Add possible types as inline fragments
  try {
    if (schema.getPossibleTypes) {
      const unionTypes = schema.getPossibleTypes(unionType);
      if (unionTypes && unionTypes.length > 0) {
        unionTypes.forEach(type => {
          const typeName = type.name;
          // Create a new visited set for each possible type
          const newVisitedTypes = new Set(visitedTypes);
          result[`on_${typeName}`] = recurseFields(type, schema, options, newVisitedTypes);
        });
      }
    }
  } catch (error) {
    // If there's an error getting possible types, just continue
    // This can happen in test scenarios with mock schemas
  }
  
  return result;
}

module.exports = createSelectionObject; 