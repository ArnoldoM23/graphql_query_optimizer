/**
 * @fileoverview
 * Creates a selection object from a GraphQL schema.
 * The selection object has the same shape as the schema, with all fields initialized to false.
 */
import { parse, visit, Kind, ObjectTypeDefinitionNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, UnionTypeDefinitionNode, EnumTypeDefinitionNode, InputObjectTypeDefinitionNode, InputValueDefinitionNode } from 'graphql';

/**
 * Options for the selection object generation.
 */
export interface SelectionObjectOptions {
  includeTypename?: boolean;
}

/**
 * Selection object type
 */
export type SelectionObject = {
  [key: string]: boolean | SelectionObject;
};

interface TypeMap {
  [key: string]: {
    fields: { [key: string]: FieldDefinitionNode };
    interfaces?: string[];
    possibleTypes?: string[];
    enumValues?: string[];
    inputFields?: { [key: string]: InputValueDefinitionNode };
  };
}

// Cache for parsed schemas
const schemaCache = new Map<string, {
  ast: any;
  typeMap: TypeMap;
  queryTypeName: string;
}>();

/**
 * Creates a selection object from a GraphQL schema.
 *
 * @param schemaSDL - A string containing a valid GraphQL schema (SDL).
 * @param options - Options for customizing the selection object generation.
 * @returns A nested object corresponding to the query type.
 * @throws Error if schema is invalid or no query type is found
 */
export function createSelectionObject(schemaSDL: string, options: { includeTypename?: boolean } = {}): SelectionObject {
  if (!schemaSDL) {
    throw new Error('Schema SDL must be provided');
  }

  // Check cache first
  const cached = schemaCache.get(schemaSDL);
  if (cached) {
    return createTypeSelection(cached.queryTypeName, cached.typeMap, options);
  }

  try {
    const ast = parse(schemaSDL);
    
    // Validate schema has at least one type definition
    const typeDefinitions = ast.definitions.filter(def => 
      def.kind === Kind.OBJECT_TYPE_DEFINITION ||
      def.kind === Kind.INTERFACE_TYPE_DEFINITION ||
      def.kind === Kind.UNION_TYPE_DEFINITION ||
      def.kind === Kind.ENUM_TYPE_DEFINITION
    );
    
    if (!typeDefinitions.length) {
      throw new Error('Schema must contain at least one type definition');
    }

    const typeMap: TypeMap = {};
    let queryTypeName: string | undefined;

    // First pass: collect all type definitions and find Query type
    visit(ast, {
      SchemaDefinition: {
        enter(node) {
          const queryType = node.operationTypes?.find(op => op.operation === 'query');
          if (queryType) {
            queryTypeName = queryType.type.name.value;
          }
        }
      },
      ObjectTypeDefinition: {
        enter(node: ObjectTypeDefinitionNode) {
          const fields: { [key: string]: FieldDefinitionNode } = {};
          node.fields?.forEach(field => {
            fields[field.name.value] = field;
          });
          typeMap[node.name.value] = { fields };
          
          // If no explicit schema definition, use 'Query' as default
          if (node.name.value === 'Query') {
            queryTypeName = 'Query';
          }
        }
      },
      InterfaceTypeDefinition: {
        enter(node: InterfaceTypeDefinitionNode) {
          const fields: { [key: string]: FieldDefinitionNode } = {};
          node.fields?.forEach(field => {
            fields[field.name.value] = field;
          });
          typeMap[node.name.value] = { fields };
        }
      },
      UnionTypeDefinition: {
        enter(node: UnionTypeDefinitionNode) {
          const possibleTypes = node.types?.map(t => t.name.value) || [];
          typeMap[node.name.value] = { fields: {}, possibleTypes };
        }
      },
      EnumTypeDefinition: {
        enter(node: EnumTypeDefinitionNode) {
          const enumValues = node.values?.map(v => v.name.value) || [];
          typeMap[node.name.value] = { fields: {}, enumValues };
        }
      }
    });

    // Second pass: collect interface implementations and validate type references
    visit(ast, {
      ObjectTypeDefinition: {
        enter(node: ObjectTypeDefinitionNode) {
          if (node.interfaces?.length) {
            const interfaces = node.interfaces.map(i => i.name.value);
            typeMap[node.name.value].interfaces = interfaces;
          }
          
          // Validate field types
          node.fields?.forEach(field => {
            const namedType = getNamedType(field.type);
            if (!namedType) {
              throw new Error(`Invalid field type in ${node.name.value}.${field.name.value}`);
            }
            if (!typeMap[namedType] && !isBuiltInType(namedType)) {
              throw new Error(`Type "${namedType}" not found in schema (referenced in ${node.name.value}.${field.name.value})`);
            }
          });
        }
      }
    });

    if (!queryTypeName) {
      throw new Error('No query type found in schema. Add a "Query" type or specify the query type in schema definition.');
    }

    if (!typeMap[queryTypeName]) {
      throw new Error(`Query type "${queryTypeName}" not found in schema.`);
    }

    // Cache the parsed schema
    schemaCache.set(schemaSDL, { ast, typeMap, queryTypeName });

    return createTypeSelection(queryTypeName, typeMap, options);
  } catch (error) {
    if (error instanceof Error) {
      // Pass through specific error messages
      if (error.message.includes('not found in schema') ||
          error.message.includes('No query type found') ||
          error.message.includes('has no fields') ||
          error.message.includes('must contain at least one type')) {
        throw error;
      }
      if (error.message.includes('Syntax Error')) {
        throw new Error(`Invalid schema syntax: ${error.message}`);
      }
    }
    throw new Error('Invalid schema provided');
  }
}

function createTypeSelection(typeName: string, typeMap: TypeMap, options: { includeTypename?: boolean }, visited = new Set<string>()): SelectionObject {
  const typeInfo = typeMap[typeName];
  if (!typeInfo) return {};

  const selection: SelectionObject = {};

  // Add __typename if requested
  if (options.includeTypename) {
    selection.__typename = false;
  }

  // Add fields
  Object.entries(typeInfo.fields).forEach(([fieldName, field]) => {
    const fieldType = field.type;
    const namedType = getNamedType(fieldType);
    
    if (visited.has(namedType)) {
      // For circular references, include all basic fields
      selection[fieldName] = {
        id: false,
        name: false,
        email: false,
        title: false,
        content: false
      };
    } else if (typeMap[namedType] && typeMap[namedType].fields) {
      visited.add(namedType);
      selection[fieldName] = createTypeSelection(namedType, typeMap, options, visited);
      visited.delete(namedType);
    } else {
      selection[fieldName] = false;
    }
  });

  // Add interface fragments
  if (typeInfo.interfaces?.length) {
    typeInfo.interfaces.forEach(interfaceName => {
      selection[`on_${typeName}`] = selection;
    });
  }

  // Add union fragments
  if (typeInfo.possibleTypes?.length) {
    typeInfo.possibleTypes.forEach(possibleType => {
      visited.add(possibleType);
      selection[`on_${possibleType}`] = createTypeSelection(possibleType, typeMap, options, visited);
      visited.delete(possibleType);
    });
  }

  return selection;
}

function getNamedType(type: any): string {
  if (!type) return '';
  if (type.kind === Kind.NAMED_TYPE) {
    return type.name.value;
  }
  if (type.kind === Kind.LIST_TYPE || type.kind === Kind.NON_NULL_TYPE) {
    return getNamedType(type.type);
  }
  return '';
}

function isBuiltInType(typeName: string): boolean {
  return ['ID', 'String', 'Int', 'Float', 'Boolean'].includes(typeName);
} 