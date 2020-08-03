const {
  getDirectives,
  mapSchema,
  MapperKind
} = require('graphql-tools');
const {
  getNamedType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull
} = require('graphql');

const DIRECVTIVE_NAME = 'addListWrapper';
const listWrapperTypeDefs = `directive @${DIRECVTIVE_NAME} on FIELD_DEFINITION`;

const listWrapperTransformer = (schema) => {
  const listWrapperTypes = new Map();

  return mapSchema(schema, {
    [MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName) => {
      const hasDirectiveAnnotation = !!getDirectives(schema, fieldConfig)[DIRECVTIVE_NAME];

      // Leave the field untouched if it does not have the directive annotation
      if (!hasDirectiveAnnotation) {
        return undefined;
      }

      const itemTypeInList = getNamedType(fieldConfig.type);
      const itemTypeNameInList = itemTypeInList.name;

      // 1. Creating the XListWrapper type and replace the type of the field with that
      if (!listWrapperTypes.has(itemTypeNameInList)) {
        listWrapperTypes.set(itemTypeNameInList, new GraphQLObjectType({
          name: `${itemTypeNameInList}ListWrapper`,
          fields: {
            // Adding `size` field
            size: {
              type: new GraphQLNonNull(GraphQLInt),
              description: 'The number of items in the `items` field',
            },
            // Creating a new List which contains the same type than the original List
            items: {
              type: new GraphQLNonNull(new GraphQLList(itemTypeInList))
            }
          }
        }));
      }

      fieldConfig.type = listWrapperTypes.get(itemTypeNameInList);

      // 2. Replacing resolver to return `{ size, items }`
      const originalResolver = fieldConfig.resolve;

      fieldConfig.resolve = (parent, args, ctx, info) => {
        const value = originalResolver ? originalResolver(parent, args, ctx, info) : parent[fieldName];
        const items = value || [];

        return {
          size: items.length,
          items
        };
      };

      // 3. Returning the updated `fieldConfig`
      return fieldConfig;
    },
  });
}

module.exports = {
  listWrapperTypeDefs,
  listWrapperTransformer,
};
