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
import { getModulePath, assertNever } from '@zeroconf/codegen/Util';
import { TypeNode, FieldDefinitionNode } from 'graphql';
import * as ts from 'typescript';

interface GenerateOptions {
	context?: string;
	headerComment?: string;
	root?: string;
}

function formatType(type: TypeNode): string {
	switch (type.kind) {
		case 'ListType':
			return `[${formatType(type.type)}]`;
		case 'NonNullType':
			return `${formatType(type.type)}!`;
		case 'NamedType':
			return type.name.value;
		default:
			return assertNever(type, `Unknown type node kind: ${type == null ? null : type!.kind}`);
	}
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

function resolveType(node: FieldDefinitionNode): Field {
	return {
		fieldName: node.name.value,
		...resolveTypeNode(node.type),
	};
}

function resolveInterfaceTypeArgs(interfaceName: string, typeName: string): string[] | undefined {
	switch (true) {
		case interfaceName.endsWith('Edge'):
			return [typeName.substr(0, typeName.length - 'Edge'.length)];
		case interfaceName.endsWith('Connection'):
			return [typeName.substr(0, typeName.length - 'Connection'.length)];
		default:
			return undefined;
	}
}

// class ResolverRegistry {}

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
		context.logger.info('Plugins/GraphQLResolver');

		const { headerComment = defaultHeaderComment } = config;
		let outputFile = createSourceFile('');

		// const registry = new ResolverRegistry();

		const types: {
			[typeName: string]: Field[];
		} = {};
		const interfaceMap: {
			[typeName: string]: undefined | { typeName: string; typeArgs?: string[] }[];
		} = {};
		const resolvers: {
			[typeName: string]: (Field & { fieldArgs?: {} })[];
		} = {};

		let currentTypeFields: Field[];
		const visit: SchemaASTVisitor = {
			Directive: (node) => {
				context.logger.verbose(`@${node.name.value}`);
			},
			FieldDefinition: (node, typeInfo) => {
				const parentType = typeInfo.parentType.name.value;
				context.logger.verbose(`Field: ${parentType}.${node.name.value}: ${formatType(node.type)}`);
				if (
					(node.arguments != null && node.arguments.length > 0) ||
					(node.directives != null && node.directives.find(d => d.name.value === 'resolve') != null)
				) {
					if (resolvers[parentType] == null) {
						resolvers[parentType] = [];
					}
					resolvers[parentType].push(resolveType(node));
				} else {
					currentTypeFields.push(resolveType(node));
				}
			},
			InterfaceTypeDefinition: (node) => {
				context.logger.debug(`Interface: ${node.name.value}`);
				if (types[node.name.value] == null) {
					currentTypeFields = types[node.name.value] = [];
				} else {
					currentTypeFields = types[node.name.value];
				}
			},
			InterfaceTypeExtension: (node) => {
				context.logger.debug(`Interface extension: ${node.name.value}`);
				if (types[node.name.value] == null) {
					currentTypeFields = types[node.name.value] = [];
				} else {
					currentTypeFields = types[node.name.value];
				}
			},
			ObjectTypeDefinition: (node) => {
				const typeName = node.name.value;
				context.logger.debug(`Type: ${typeName}`);
				if (types[typeName] == null) {
					currentTypeFields = types[typeName] = [];
				} else {
					currentTypeFields = types[typeName];
				}
				if (node.interfaces != null) {
					const currentInterfaceMap = interfaceMap[typeName];
					const additionalInterfaceMap = (interfaceMap[typeName] = node.interfaces.map((iface) => ({
						typeName: iface.name.value,
						typeArgs: resolveInterfaceTypeArgs(iface.name.value, typeName),
					})));
					if (currentInterfaceMap == null) {
						interfaceMap[typeName] = additionalInterfaceMap;
					} else {
						interfaceMap[typeName] = [...currentInterfaceMap, ...additionalInterfaceMap];
					}
				}
			},
			ObjectTypeExtension: (node) => {
				context.logger.debug(`Type extension: ${node.name.value}`);
				if (types[node.name.value] == null) {
					currentTypeFields = types[node.name.value] = [];
				} else {
					currentTypeFields = types[node.name.value];
				}
			},
		};

		context.graphql.schemaContext.visitSchema(visit);

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

			// Generate types from schema.
			...Object.entries(types)
				.filter(([typeName]) => !relayTypes.includes(typeName))
				.map(([typeName, fields]) => generateObjectType(typeName, fields, interfaceMap)),
			...Object.entries(resolvers)
				.reduce((carry, [typeName, fields]) => [...carry, ...generateObjectTypeFieldResolvers(typeName, fields)], [] as ts.Statement[]),
		]);

		return printSourceFile(addHeaderComment(outputFile, headerComment), context.outputStream);
	},
};

export = plugin;