const { makeExecutableSchema } = require('graphql-tools');
const gql = require('graphql-tag');
const { listWrapperTypeDefs, listWrapperTransformer } = require('./listWrapperTransformer');

// -- Types
const typeDefs = gql`
  type Query {
    me: Person
  }

  type Person {
    name: String!
    friends: [Person] @addListWrapper
  }
`;

// -- Schema
const schema = makeExecutableSchema({
  typeDefs: [
    listWrapperTypeDefs,
    typeDefs,
  ],
  resolvers: {
    Query: {
      me: () => ({
        name: 'David',
        friends: [
          { name: 'Adam', friends: [] },
          { name: 'Becky', friends: [] },
          { name: 'Charles', friends: [] },
        ]
      })
    }
  },
  schemaTransforms: [
    listWrapperTransformer,
  ],
});

module.exports = {
  schema
};
