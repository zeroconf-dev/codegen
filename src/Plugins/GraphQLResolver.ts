import { isMaybeString } from '@zeroconf/codegen/Config';
import { GraphQLSchemaCodegenContextExtension, SchemaASTVisitor } from '@zeroconf/codegen/GraphQL';
import {
	generateContextType,
	generateExtractResponseTypeLookupUtilityType,
	generateExtractResponseTypeUtilityType,
	generateGraphQLResolveInfoImportStatement,
	generateMaybeUtilityType,
	generateObjectType,
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
	relayTypes,
	FieldType,
	Field,
	generateObjectTypeFieldResolvers,
} from '@zeroconf/codegen/Plugins/GraphQLResolver/GraphQLResolverHelpers';
import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import {
	createSourceFile,
	printSourceFile,
	defaultHeaderComment,
	addHeaderComment,
} from '@zeroconf/codegen/Typescript';
import { getModulePath, assertNever, filter, pipe, map } from '@zeroconf/codegen/Util';
import { TypeNode, FieldDefinitionNode, InputValueDefinitionNode } from 'graphql';
import * as ts from 'typescript';

interface GenerateOptions {
	context?: string;
	headerComment?: string;
	root?: string;
}

function resolveTypeNode(node: TypeNode): FieldType {
	switch (node.kind) {
		case 'ListType':
			return { listOf: resolveTypeNode(node.type), nullable: true };
		case 'NamedType':
			return { fieldType: node.name.value, nullable: true };
		case 'NonNullType':
			return { ...resolveTypeNode(node.type), nullable: false };
		default:
			return assertNever(node, `Unknown type node: ${node ?? node!.kind}`);
	}
}

function resolveType(node: FieldDefinitionNode | InputValueDefinitionNode): Field {
	return {
		fieldName: node.name.value,
		...resolveTypeNode(node.type),
	};
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

		const resolvers: {
			[typeName: string]: (Field & { fieldArgs?: Field[] })[];
		} = {};

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
			...pipe(
				schemaContext.typeInfo.interfaceDefinitions.keys(),
				filter((typeName) => !relayTypes.includes(typeName)),
				map((typeName) =>
					generateObjectType(schemaContext, typeName, schemaContext.typeInfo.getFieldDefinitionMap(typeName)),
				),
			),
			...pipe(
				schemaContext.typeInfo.objectDefinitions.keys(),
				filter((typeName) => !relayTypes.includes(typeName)),
				map((typeName) =>
					generateObjectType(schemaContext, typeName, schemaContext.typeInfo.getFieldDefinitionMap(typeName)),
				),
			),

			// Generate resolvers from schema.
			...pipe(
				schemaContext.typeInfo.objectDefinitions.keys(),
				filter((typeName) => !relayTypes.includes(typeName)),
				map((typeName: string) => ({
					typeName,
					fields: schemaContext.typeInfo.getFieldDefinitionMap(typeName),
				})),
				map(([typeName, fields]) => generateObjectTypeFieldResolvers(typeName, fields)),
			),
		]);

		return printSourceFile(addHeaderComment(outputFile, headerComment), context.outputStream);
	},
};

export = plugin;
