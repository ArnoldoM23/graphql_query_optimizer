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

/**
 * Creates a selection object from a GraphQL schema.
 *
 * @param schemaSDL - A string containing a valid GraphQL schema (SDL).
 * @param options - Options for customizing the selection object generation.
 * @returns A nested object corresponding to the query type.
 */
export function createSelectionObject(schemaSDL: string, options: { includeTypename?: boolean } = {}): SelectionObject {
  const ast = parse(schemaSDL);
  const typeMap: TypeMap = {};
  const selection: SelectionObject = {};

  // First pass: collect all type definitions
  visit(ast, {
    ObjectTypeDefinition: {
      enter(node: ObjectTypeDefinitionNode) {
        const fields: { [key: string]: FieldDefinitionNode } = {};
        node.fields?.forEach(field => {
          fields[field.name.value] = field;
        });
        typeMap[node.name.value] = { fields };
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
    },
    InputObjectTypeDefinition: {
      enter(node: InputObjectTypeDefinitionNode) {
        const inputFields: { [key: string]: InputValueDefinitionNode } = {};
        node.fields?.forEach(field => {
          inputFields[field.name.value] = field;
        });
        typeMap[node.name.value] = { fields: {}, inputFields };
      }
    }
  });

  // Second pass: collect interface implementations
  visit(ast, {
    ObjectTypeDefinition: {
      enter(node: ObjectTypeDefinitionNode) {
        if (node.interfaces?.length) {
          const interfaces = node.interfaces.map(i => i.name.value);
          typeMap[node.name.value].interfaces = interfaces;
        }
      }
    }
  });

  // Create selection object for each type
  Object.entries(typeMap).forEach(([typeName, typeInfo]) => {
    if (typeInfo.fields) {
      const typeSelection: SelectionObject = {};
      
      // Add __typename if requested
      if (options.includeTypename) {
        typeSelection.__typename = false;
      }

      // Add all fields with false value
      Object.entries(typeInfo.fields).forEach(([fieldName, field]) => {
        typeSelection[fieldName] = false;
      });

      // Add interface fragments if type implements interfaces
      if (typeInfo.interfaces?.length) {
        typeInfo.interfaces.forEach(interfaceName => {
          typeSelection[`on_${typeName}`] = typeSelection;
        });
      }

      // Add union fragments if type is part of a union
      Object.entries(typeMap).forEach(([otherTypeName, otherTypeInfo]) => {
        if (otherTypeInfo.possibleTypes?.includes(typeName)) {
          typeSelection[`on_${typeName}`] = typeSelection;
        }
      });

      selection[typeName] = typeSelection;
    }
  });

  return selection;
} 