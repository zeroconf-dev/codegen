import { isMaybeString } from '@zeroconf/codegen/Config';
import { GraphQLSchemaCodegenContextExtension } from '@zeroconf/codegen/GraphQL';
import {
	generateContextType,
	generateExtractResponseTypeLookupUtilityType,
	generateExtractResponseTypeUtilityType,
	generateGraphQLResolveInfoImportStatement,
	generateMaybeUtilityType,
	generatePreserveMaybeUtilityType,
	generateRelayBackwardConnectionArgsType,
	generateRelayConnectionArgsMapInterface,
	generateRelayConnectionArgsUtilityType,
	generateRelayConnectionDirectionUtilityType,
	generateRelayConnectionInterface,
	generateRelayEdgeInterface,
	generateRelayForwardConnectionArgsType,
	generateRelayNodeInterface,
	generateRelayPageInfoInterface,
	generateResolverResultUtilityType,
	generateResolverReturnTypeUtilityType,
	generateResolversFnUtilityType,
	generateResponseTypeLookupUtilityType,
	generateResponseTypeMapInterface,
	generateResponseTypeUtilityType,
	generateRootType,
	generateScalarsMapInterface,
	generateUnwrapPromiseUtilityType,
	generateInterfaceOutputTypes,
	generateObjectOutputTypes,
	generateObjectTypeResolvers,
} from '@zeroconf/codegen/Plugins/GraphQLResolver/GraphQLResolverHelpers';
import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import {
	createSourceFile,
	printSourceFile,
	defaultHeaderComment,
	addHeaderComment,
} from '@zeroconf/codegen/Typescript';
import { getModulePath } from '@zeroconf/codegen/Util';
import * as ts from 'typescript';

interface GenerateOptions {
	context?: string;
	headerComment?: string;
	root?: string;
}

const plugin: CodegenPlugin<GenerateOptions, GraphQLSchemaCodegenContextExtension> = {
	config: async (config) => {
		if (!isMaybeString(config.headerComment)) {
			throw new Error(`Expected 'headerComment' to be a string, got: ${typeof config.headerComment}`);
		}
		if (!isMaybeString(config.context)) {
			throw new Error(`Expected 'context' to be a string, got: ${typeof config.context}`);
		}
		if (!isMaybeString(config.root)) {
			throw new Error(`Expected 'root' to be a string, got: ${typeof config.root}`);
		}
		return config as GenerateOptions;
	},
	generate: async (context, config) => {
		const { logger } = context;
		logger.info('Plugins/GraphQLResolver');

		const { headerComment = defaultHeaderComment } = config;
		const { schemaContext } = context.graphql;

		let outputFile = createSourceFile('');

		schemaContext.visitSchema({});

		outputFile = ts.updateSourceFileNode(outputFile, [
			...outputFile.statements,

			// Built-in types and utilities.
			generateGraphQLResolveInfoImportStatement(),
			generateRootType(config.root == null ? undefined : getModulePath(config.root)),
			generateContextType(config.context == null ? undefined : getModulePath(config.context)),
			generateScalarsMapInterface(),
			generateResolverResultUtilityType(),
			generateMaybeUtilityType(),
			generatePreserveMaybeUtilityType(),
			generateResolversFnUtilityType(),
			generateUnwrapPromiseUtilityType(),
			generateResolverReturnTypeUtilityType(),
			generateResponseTypeMapInterface([]),
			generateExtractResponseTypeLookupUtilityType(),
			generateExtractResponseTypeUtilityType(),
			generateResponseTypeLookupUtilityType(),
			generateResponseTypeUtilityType(),

			// Relay types and utilities.
			generateRelayPageInfoInterface(),
			generateRelayNodeInterface(),
			generateRelayEdgeInterface(),
			generateRelayConnectionDirectionUtilityType(),
			generateRelayForwardConnectionArgsType(),
			generateRelayBackwardConnectionArgsType(),
			generateRelayConnectionArgsMapInterface(),
			generateRelayConnectionArgsUtilityType(),
			generateRelayConnectionInterface(),

			// Generate resolver output types from schema.
			...generateInterfaceOutputTypes(schemaContext),
			...generateObjectOutputTypes(schemaContext),

			// Generate resolvers from schema.
			...generateObjectTypeResolvers(schemaContext),
		]);

		return printSourceFile(addHeaderComment(outputFile, headerComment), context.outputStream);
	},
};

export = plugin;
