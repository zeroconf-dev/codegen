import { GraphQLSchemaCodegenContextExtension } from '@zeroconf/codegen/GraphQL';
import {
	generateContextType,
	generateExtractResponseTypeLookupUtilityType,
	generateExtractResponseTypeUtilityType,
	generateGraphQLResolveInfoImportStatement,
	generateInterfaceOutputTypes,
	generateMaybeUtilityType,
	generateObjectOutputTypes,
	generateObjectResponseTypes,
	generateObjectTypeResolvers,
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
	generateInputObjectTypes,
} from '@zeroconf/codegen/Plugins/GraphQLResolver/GraphQLResolverHelpers';
import {
	addHeaderComment,
	createSourceFile,
	defaultHeaderComment,
	printSourceFile,
} from '@zeroconf/codegen/Typescript';
import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import { getModulePath, isMaybeString } from '@zeroconf/codegen/Util';
import * as ts from 'typescript';

interface GenerateOptions {
	context?: string;
	headerComment?: string;
	root?: string;
}

export const plugin: CodegenPlugin<GenerateOptions, GraphQLSchemaCodegenContextExtension> = {
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

		let outputFile = createSourceFile();

		schemaContext.visitSchema({});

		outputFile = ts.factory.updateSourceFile(outputFile, [
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

			// Generate input type definitions.
			...generateInputObjectTypes(schemaContext),

			// Generate resolver output types from schema.
			...generateInterfaceOutputTypes(schemaContext),
			...generateObjectOutputTypes(schemaContext),

			// Generate resolvers from schema.
			...generateObjectTypeResolvers(schemaContext),

			// Generate resolved response types.
			// The complete type definitions (output types and resolvers combined),
			// and return value unwrapped.
			generateResponseTypeMapInterface(schemaContext.typeInfo.objectDefinitions.keys()),
			...generateObjectResponseTypes(schemaContext),
		]);

		return printSourceFile(addHeaderComment(outputFile, headerComment), context.outputStream);
	},
};
