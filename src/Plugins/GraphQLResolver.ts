import { OutputConfig } from '@zeroconf/codegen/Config';
import { createContext, loadSourceFile } from '@zeroconf/codegen/GraphQL';
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
import { PluginContext, PluginGenerator, PluginValidateConfigContext } from '@zeroconf/codegen/Runner';
import {
	addHeaderComment,
	createSourceFile,
	defaultHeaderComment,
	printSourceFile,
} from '@zeroconf/codegen/Typescript';
import { getModulePath } from '@zeroconf/codegen/Util';
import { DocumentNode } from 'graphql';
import { join } from 'path';
import * as ts from 'typescript';

interface GenerateOptions {
	context?: string;
	headerComment?: string;
	outputConfig: OutputConfig;
	root?: string;
}

export async function* plugin(ctx: PluginContext): PluginGenerator {
	ctx.yieldUntil(ctx.phases.validateConfig);
	yield;

	const config = await ctx.validate.runConfigValidation<GenerateOptions>(validateConfig);
	// const { logger } = ctx;
	// logger.info('Plugins/GraphQLResolver');

	const { headerComment = defaultHeaderComment } = config;

	ctx.yieldUntil(ctx.phases.loadInput);
	yield;

	const documents = await ctx.load.loadInputFiles(async (inputStream) => {
		const docs: Promise<DocumentNode>[] = [];
		for await (const filePath of inputStream) {
			docs.push(loadSourceFile(join(config.outputConfig.directory, filePath.toString())));
		}
		return Promise.all(docs);
	});

	ctx.yieldUntil(ctx.phases.generate);
	yield;

	const schemaContext = createContext(documents, null as any);
	let outputFile = createSourceFile();

	schemaContext.visitSchema({});

	outputFile = ts.factory.updateSourceFile(createSourceFile(), [
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

	ctx.yieldUntil(ctx.phases.emit);
	yield;

	return ctx.emit.writeOutput(async ({ outputFileStream }) => {
		await printSourceFile(addHeaderComment(outputFile, headerComment), outputFileStream);
	});
}

const validateConfig = async (
	ctx: PluginValidateConfigContext,
	rawConfig: unknown,
	outputConfig: OutputConfig,
): Promise<GenerateOptions> => {
	if (rawConfig != null) {
		ctx.assertObject(rawConfig, `Invalid config, got: ${rawConfig}`);
		ctx.assertMaybeString(
			rawConfig.headerComment,
			`Expected 'headerComment' to be a string, got: ${typeof rawConfig.headerComment}`,
		);
		ctx.assertMaybeString(rawConfig.context, `Expected 'context' to be a string, got: ${typeof rawConfig.context}`);
		ctx.assertMaybeString(rawConfig.root, `Expected 'root' to be a string, got: ${typeof rawConfig.root}`);
	}

	return {
		...((rawConfig as Maybe<Omit<GenerateOptions, 'outputConfig'>>) ?? {}),
		outputConfig,
	} as GenerateOptions;
};
