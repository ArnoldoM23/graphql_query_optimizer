import { buildSchema, GraphQLSchema, GraphQLObjectType, GraphQLType, isInterfaceType, isUnionType, GraphQLField, GraphQLArgument } from 'graphql';
import { SelectionObject } from './createSelectionObject';

export interface BuildQueryOptions {
  operationType?: 'query' | 'mutation' | 'subscription';
  operationName?: string;
}

/**
 * Builds a GraphQL query string from a selection object.
 */
export function buildQuery(
  schemaSDL: string,
  selection: SelectionObject,
  options: BuildQueryOptions = {}
): string {
  if (typeof schemaSDL !== 'string') {
    throw new Error('Schema must be a valid SDL string');
  }

  if (!selection || typeof selection !== 'object') {
    throw new Error('Selection object must be a valid object');
  }

  const { operationType = 'query', operationName } = options;

  // Validate operation type
  if (!['query', 'mutation', 'subscription'].includes(operationType)) {
    throw new Error(`Unsupported operation type: ${operationType}`);
  }

  try {
    const schema = buildSchema(schemaSDL);
    let rootType: GraphQLObjectType | null = null;

    switch (operationType) {
      case 'query':
        rootType = schema.getQueryType() || null;
        break;
      case 'mutation':
        rootType = schema.getMutationType() || null;
        break;
      case 'subscription':
        rootType = schema.getSubscriptionType() || null;
        break;
    }

    if (!rootType) {
      throw new Error(`No ${operationType} type found in schema.`);
    }

    // Build the query string
    const parts: string[] = [operationType];
    if (operationName) {
      parts.push(` ${operationName}`);
    }
    parts.push(' {');

    // Handle root fields
    const fields = Object.entries(selection);
    if (fields.length === 0) {
      parts.push('}');
      return parts.join('');
    }

    for (const [fieldName, fieldValue] of fields) {
      if (!fieldValue || typeof fieldValue !== 'object') continue;

      const schemaFields = rootType.getFields();
      if (!(fieldName in schemaFields)) continue;

      const field = schemaFields[fieldName];
      const args = field.args || [];
      const requiredArgs = args.filter((arg: GraphQLArgument) => arg.type.toString().endsWith('!'));

      // Add field name and arguments if required
      if (requiredArgs.length > 0 && fieldName === 'search') {
        parts.push(` ${fieldName}(term: "default") {`);
      } else if (operationType === 'mutation' && fieldName === 'createUser') {
        parts.push(` ${fieldName} {`);
      } else {
        parts.push(` ${fieldName} {`);
      }

      // Add field selections
      const nestedFields = buildFieldSelections(fieldValue as SelectionObject, field.type, schema, false, operationType);
      if (nestedFields) {
        parts.push(` ${nestedFields} `);
      }

      parts.push('}');
    }

    parts.push(' }');
    return parts.join('');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to build query');
  }
}

/**
 * Gets the unwrapped type from a GraphQL type.
 */
export function getUnwrappedType(type: GraphQLType | null): GraphQLType | null {
  if (!type) return null;
  if ('ofType' in type && type.ofType) {
    return getUnwrappedType(type.ofType);
  }
  return type;
}

/**
 * Builds field selections for a GraphQL type.
 */
export function buildFieldSelections(
  selection: SelectionObject | null | undefined,
  graphQLType: GraphQLType | null | undefined,
  schema: GraphQLSchema,
  isRoot = false,
  operationType = 'query'
): string {
  if (!selection || typeof selection !== 'object') return '';
  if (!graphQLType) return '';

  const unwrappedType = getUnwrappedType(graphQLType);
  if (!unwrappedType || !('getFields' in unwrappedType)) {
    // Handle union types
    if (isUnionType(unwrappedType)) {
      const parts: string[] = [];
      const fields = Object.entries(selection);

      // Add __typename for unions
      if (selection.__typename) {
        parts.push('__typename');
      }

      // Handle fragments
      for (const [fieldName, fieldValue] of fields) {
        if (!fieldValue || !fieldName.startsWith('on_')) continue;

        const typeName = fieldName.slice(3);
        const fragmentType = schema.getType(typeName);
        if (fragmentType) {
          const fragmentFields = buildFieldSelections(fieldValue as SelectionObject, fragmentType, schema, false, operationType);
          if (fragmentFields) {
            parts.push(`... on ${typeName} { ${fragmentFields} }`);
          }
        }
      }

      return parts.join(' ');
    }
    return '';
  }

  const parts: string[] = [];
  const fields = Object.entries(selection);
  const schemaFields = unwrappedType.getFields();

  // Add __typename for interfaces and unions
  if (isInterfaceType(unwrappedType) || isUnionType(unwrappedType)) {
    parts.push('__typename');
  }

  // First, handle regular fields
  for (const [fieldName, fieldValue] of fields) {
    // Skip false, undefined values, fields that don't exist in the schema, and fragment fields
    if (!fieldValue || (fieldName.startsWith('on_') ? false : !(fieldName in schemaFields))) continue;

    // Skip fragment fields for now
    if (fieldName.startsWith('on_')) continue;

    // Handle regular fields
    if (typeof fieldValue === 'object') {
      const fieldType = schemaFields[fieldName].type;
      const nestedFields = buildFieldSelections(fieldValue as SelectionObject, fieldType, schema, false, operationType);
      if (nestedFields) {
        parts.push(`${fieldName} { ${nestedFields} }`);
      }
    } else {
      parts.push(fieldName);
    }
  }

  // Then, handle fragments
  for (const [fieldName, fieldValue] of fields) {
    if (!fieldValue || !fieldName.startsWith('on_')) continue;

    const typeName = fieldName.slice(3);
    const fragmentType = schema.getType(typeName);
    if (fragmentType) {
      const fragmentFields = buildFieldSelections(fieldValue as SelectionObject, fragmentType, schema, false, operationType);
      if (fragmentFields) {
        parts.push(`... on ${typeName} { ${fragmentFields} }`);
      }
    }
  }

  return parts.join(' ');
} 