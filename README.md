This simple repository was made to demonstrate a bug in `graphql-tools` (or `graphql`?).

## Background

The schema:

```gql
  type Query {
    me: Person
  }

  type Person {
    name: String!
    friends: [Person] @addListWrapper
  }
```

There is a schema transformer implemented which replaces the types of fields which use the `@addListWrapper` directive with a `ListWrapper` type:

```gql
  type Query {
    me: Person
  }

  type Person {
    name: String!
    friends: PersonListWrapper
  }

  type PersonListWrapper {
    size: Int!
    items: [Person]!
  }
```

## The bug

When running this application there is an error thrown:

```
Error: Schema must contain uniquely named types but contains multiple types named "Person".
```

After some investigation I think the issue is:
1. `mapSchema` invokes the schema mapper in `listWrapperTransformer` which creates the new `PersonListWrapper` type which references the existing `Person` type from the current schema.
1. Before `mapSchema` creates the new schema it [rewires the TypeMap](https://github.com/ardatan/graphql-tools/blob/ae7c968deb2e6f51024a385abfc6455c0db5a5df/packages/utils/src/mapSchema.ts#L78) creating new types by "cloning" the existing types (if I understand it correctly).
1. The constructor of `GraphQLSchema` collects all the types inside the type definitions using a function called [collectReferencedTypes](https://github.com/graphql/graphql-js/blob/master/src/type/schema.js#L403), which walks throught the type definitions and stores all the referenced types in a map using the type object as a key.
1. The constructor of `GraphQLSchema` then checks whether there is a type defined multiple times with the same name.

This process blows up in Step 4 because `Person` is present 2 times in the Type Map. I think one of them is the `Person` type (after the rewiring in Step2), and the second one is the `Person` type which is referenced in the `PersonListWrapper` type which at this point points to the original `Person` type (not the rewired one), as the rewiring didn't update the type reference here.

## Testing

After removing [those lines which throws the error in Step 4 ](https://github.com/graphql/graphql-js/blob/master/src/type/schema.js#L221) the application works and this query works fine:

```gql
{
  me {
    name
    friends {
      size
      items {
        name
      }
    }
  }
}
```

and returns the correct data:

```json
{
  "data": {
    "me": {
      "name": "David",
      "friends": {
        "size": 3,
        "items": [
          {
            "name": "Adam"
          },
          {
            "name": "Becky"
          },
          {
            "name": "Charles"
          }
        ]
      }
    }
  }
}

```

Which proves that the transformer in this repository works correctly, and the issue is either:
- in `graphql-tools` in the rewiring process, which doesn't update the type references correctly
- in `graphql` in the `GraphQLSchema` constructor, which does not compare the duplicated types correctly (it just checks the name of the types, not the whole definition)
