import * as fg from 'fast-glob';
import { DocumentNode, printSchema } from 'graphql';
import { join } from 'path';
import { loadSourceFile, createContext } from '@zeroconf/codegen/GraphQL';

interface GenerateOptions {
	directory: string;
	globPattern?: string;
}

const defaultGlobPattern = '**/*.graphql|*.gql';

const plugin: CodegenPlugin<GenerateOptions> = {
	config: async (config) => {
		if (typeof config.directory !== 'string') {
			throw new Error('Missing directory options');
		}
		return config as GenerateOptions;
	},
	generate: async (outputStream, config) => {
		const { globPattern = defaultGlobPattern } = config;

		const documents: DocumentNode[] = [];
		for await (const filePath of fg.stream(globPattern, {
			cwd: config.directory,
			globstar: true,
		})) {
			documents.push(await loadSourceFile(
				join(config.directory, filePath.toString()),
			));
		}

		const context = createContext(documents);

		context.visitSchema({
			ObjectTypeDefinition(node) {
				console.log(node.name.value);
			},
		});

		outputStream.write(printSchema(context.schema));
	},
};

export = plugin;
