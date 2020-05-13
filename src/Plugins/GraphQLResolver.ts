import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import { GraphQLSchemaCodegenContextExtension } from '@zeroconf/codegen/GraphQL';

interface GenerateOptions {}

const plugin: CodegenPlugin<GenerateOptions, GraphQLSchemaCodegenContextExtension> = {
	config: async (config) => {
		if (typeof config.directory !== 'string') {
			throw new Error('Missing directory options');
		}
		return config as GenerateOptions;
	},
	graphql: {
		visit: {
			NamedType: (node) => {
				console.log(node.name.value);
			}
		}
	},
	generate: async (context, config) => {
		context.logger.info('Plugins/GraphQLResolver');
		context.graphql.schemaContext.visitSchema(plugin.graphql!.visit!);
	},
};

export = plugin;
