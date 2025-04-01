/**
 * @fileoverview
 * Builds GraphQL query strings from selection objects.
 */
import { buildSchema, GraphQLSchema, GraphQLObjectType, GraphQLType } from 'graphql';
import { SelectionObject } from './createSelectionObject';

/**
 * Options for customizing the query generation.
 */
export interface BuildQueryOptions {
  operationType?: 'query' | 'mutation' | 'subscription';
  operationName?: string;
}

/**
 * Recursively builds a GraphQL query string from a user selection object.
 *
 * @param selectionObject - A nested object representing user's choices (true/false).
 * @param graphQLType - The current GraphQL type (e.g. Query, or nested type).
 * @param schema - The complete GraphQL schema.
 * @return A valid field selection string to be embedded within a query.
 * @private
 */
function buildFieldSelections(
  selectionObject: SelectionObject,
  graphQLType: GraphQLType,
  schema: GraphQLSchema
): string {
  // Handle invalid inputs
  if (!selectionObject || typeof selectionObject !== 'object') {
    return '';
  }
  
  if (!graphQLType || !(graphQLType as any).getFields) {
    return '';
  }
  
  const fields = (graphQLType as any).getFields();
  const selections: string[] = [];

  // Handle empty selection objects
  if (Object.keys(selectionObject).length === 0) {
    return '';
  }

  for (const fieldName in selectionObject) {
    const isSelected = selectionObject[fieldName];
    
    // Skip special fields like on_TypeName for interfaces/unions
    if (fieldName.startsWith('on_')) {
      continue;
    }
    
    // Handle __typename field (doesn't exist in schema fields)
    if (fieldName === '__typename') {
      if (isSelected === true) {
        selections.push('__typename');
      }
      continue;
    }
    
    const field = fields[fieldName];
    if (!field) {
      // The selection object might have fields that don't exist in the schema
      // Skip them
      continue;
    }

    // Unwrap to get the core type
    let fieldType = field.type;
    while ((fieldType as any).ofType) {
      fieldType = (fieldType as any).ofType;
    }

    // If the field value is an object (might have subfields or inline fragments)
    if (typeof isSelected === 'object') {
      // Empty object - show empty brackets if the object has no keys or all keys were skipped
      if (Object.keys(isSelected).length === 0) {
        selections.push(`${fieldName} {}`);
        continue;
      }
      
      // Check if we need to handle interfaces or unions with inline fragments
      const hasInlineFragments = Object.keys(isSelected).some(key => key.startsWith('on_'));
      
      if (hasInlineFragments) {
        // Process interface/union fields with inline fragments
        const fragments: string[] = [];
        const regularSelections: string[] = [];
        
        // First, add __typename if selected
        if ((isSelected as SelectionObject).__typename === true) {
          regularSelections.push('__typename');
        }
        
        // Add regular fields that are common to the interface/union
        for (const subFieldName in isSelected) {
          if (!subFieldName.startsWith('on_') && subFieldName !== '__typename') {
            // For interfaces, the field should exist on the interface type
            const subField = (fieldType as any).getFields && (fieldType as any).getFields()[subFieldName];
            if (subField) {
              if (typeof (isSelected as SelectionObject)[subFieldName] === 'object') {
                const subFieldType = getUnwrappedType(subField.type);
                const subSelections = buildFieldSelections(
                  (isSelected as SelectionObject)[subFieldName] as SelectionObject, 
                  subFieldType, 
                  schema
                );
                if (subSelections) {
                  regularSelections.push(`${subFieldName} { ${subSelections} }`);
                }
              } else if ((isSelected as SelectionObject)[subFieldName] === true) {
                regularSelections.push(subFieldName);
              }
            }
          }
        }
        
        // Add inline fragments for specific implementations
        for (const subFieldName in isSelected) {
          if (subFieldName.startsWith('on_')) {
            const typeName = subFieldName.substring(3); // Remove 'on_'
            const typeObj = schema.getType(typeName);
            if (typeObj) {
              const fragmentSelections = buildFieldSelections(
                (isSelected as SelectionObject)[subFieldName] as SelectionObject, 
                typeObj, 
                schema
              );
              if (fragmentSelections) {
                fragments.push(`... on ${typeName} { ${fragmentSelections} }`);
              }
            }
          }
        }
        
        // Combine regular selections and fragments
        const allSelections = [...regularSelections, ...fragments].filter(Boolean).join(' ');
        if (allSelections) {
          selections.push(`${fieldName} { ${allSelections} }`);
        } else {
          // If we end up with no selections after processing, add an empty object
          selections.push(`${fieldName} {}`);
        }
      } else {
        // Regular object field
        const subSelection = buildFieldSelections(
          isSelected as SelectionObject, 
          fieldType, 
          schema
        );
        // Only add if subSelection is not empty
        if (subSelection) {
          selections.push(`${fieldName} { ${subSelection} }`);
        } else if (Object.keys(isSelected).length > 0) {
          // If no fields are selected but the object is not empty, create an empty selection
          selections.push(`${fieldName} {}`);
        }
      }
    } else if (isSelected === true) {
      // If it's scalar/enum and is marked true
      selections.push(fieldName);
    }
  }

  return selections.join(' ');
}

/**
 * Helper function to unwrap a GraphQL type (handling NonNull and List wrappers)
 * 
 * @param type - The GraphQL type to unwrap
 * @return The unwrapped GraphQL type
 * @private
 */
function getUnwrappedType(type: GraphQLType): GraphQLType {
  if (!type) return null as any;
  
  let unwrappedType = type;
  while ((unwrappedType as any).ofType) {
    unwrappedType = (unwrappedType as any).ofType;
  }
  return unwrappedType;
}

/**
 * Builds a complete query string, using the root Query type from the schema.
 *
 * @param schemaSDL - A string containing a valid GraphQL schema (SDL).
 * @param selectionObject - A nested object representing user's choices.
 * @param options - Options for customizing the query generation.
 * @return A valid GraphQL query string.
 */
function buildQuery(
  schemaSDL: string, 
  selectionObject: SelectionObject, 
  options: BuildQueryOptions = {}
): string {
  if (!schemaSDL || typeof schemaSDL !== 'string') {
    throw new Error('Schema must be a valid SDL string');
  }
  
  if (!selectionObject || typeof selectionObject !== 'object') {
    throw new Error('Selection object must be a valid object');
  }

  const schema = buildSchema(schemaSDL);
  let rootType: GraphQLObjectType;
  
  const operationType = options.operationType || 'query';
  
  // Get the appropriate root type based on the operation
  if (operationType === 'query') {
    rootType = schema.getQueryType() as GraphQLObjectType;
  } else if (operationType === 'mutation') {
    rootType = schema.getMutationType() as GraphQLObjectType;
  } else if (operationType === 'subscription') {
    rootType = schema.getSubscriptionType() as GraphQLObjectType;
  } else {
    throw new Error(`Unsupported operation type: ${operationType}`);
  }
  
  if (!rootType) {
    throw new Error(`No ${operationType} type found in schema.`);
  }

  const fieldsString = buildFieldSelections(selectionObject, rootType, schema);
  
  // Handle operation name if provided
  const operationNameStr = options.operationName ? ` ${options.operationName}` : '';
  
  // Handle empty selections
  if (!fieldsString) {
    return `${operationType}${operationNameStr} {}`;
  }
  
  // Return something like: `query OperationName { users { id name } }`
  return `${operationType}${operationNameStr} {\n  ${fieldsString}\n}`;
}

export {
  buildQuery,
  buildFieldSelections,
  getUnwrappedType
}; 