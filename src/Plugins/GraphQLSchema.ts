import { createContext, GraphQLSchemaCodegenContextExtension, loadSourceFile } from '@zeroconf/codegen/GraphQL';
import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import { DocumentNode, printSchema } from 'graphql';
import { join } from 'path';

interface PluginConfig {}

const plugin: CodegenPlugin<PluginConfig, GraphQLSchemaCodegenContextExtension> = {
	config: async (config) => config as PluginConfig,
	generate: async (context) => {
		context.logger.info('Plugins/GraphQLSchema');
		const { schema } = context.graphql.schemaContext;
		context.outputStream.write(printSchema(schema));
	},
	load: async (context): Promise<void> => {
		const documents: DocumentNode[] = [];
		for await (const filePath of context.inputStream) {
			documents.push(await loadSourceFile(join(context.outputConfig.directory, filePath.toString())));
		}

		const schemaContext = createContext(documents, context.logger);
		context.graphql = {
			schemaContext,
		};
	},
};

export = plugin;
