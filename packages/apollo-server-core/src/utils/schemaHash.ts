import { parse } from 'graphql/language';
import { execute, ExecutionResult } from 'graphql/execution';
import { getIntrospectionQuery, IntrospectionSchema } from 'graphql/utilities';
import stableStringify from 'json-stable-stringify';
import { GraphQLSchema } from 'graphql/type';
import { createHash } from 'crypto';

export function generateSchemaHash(schema: GraphQLSchema): string {
  const introspectionQuery = getIntrospectionQuery();
  const documentAST = parse(introspectionQuery);
  const result = execute(schema, documentAST) as ExecutionResult;

  // If the execution of an introspection query results in a then-able, it
  // indicates that one or more of its resolvers is behaving in an asynchronous
  // manner.  This is not the expected behavior of a introspection query
  // which does not have any asynchronous resolvers.
  if (result && typeof result.then === 'function') {
    throw new Error(
      'The introspection query is resolving asynchronously; execution of an introspection query is not expected to return a `Promise`.',
    );
  }

  if (!result || !result.data || !result.data.__schema) {
    throw new Error('Unable to generate server introspection document.');
  }

  const introspectionSchema: IntrospectionSchema = result.data.__schema;

  // It's important that we perform a deterministic stringification here
  // since, depending on changes in the underlying `graphql-js` execution
  // layer, varying orders of the properties in the introspection
  const stringifiedSchema = stableStringify(introspectionSchema);

  return createHash('sha512')
    .update(stringifiedSchema)
    .digest('hex');
}
