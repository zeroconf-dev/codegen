import { isMaybeString } from '@zeroconf/codegen/Config';
import { GraphQLSchemaCodegenContextExtension } from '@zeroconf/codegen/GraphQL';
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
} from '@zeroconf/codegen/Plugins/GraphQLResolver/GraphQLResolverHelpers';
import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import {
	createSourceFile,
	printSourceFile,
	defaultHeaderComment,
	addHeaderComment,
} from '@zeroconf/codegen/Typescript';
import { getModulePath, assertNever } from '@zeroconf/codegen/Util';
import { ASTKindToNode, TypeNode, Visitor } from 'graphql';
import * as ts from 'typescript';

interface GenerateOptions {
	context?: string;
	headerComment?: string;
	root?: string;
}

function formatType(type: TypeNode): string {
	switch (type.kind) {
		case 'ListType': return `[${formatType(type.type)}]`;
		case 'NonNullType': return `${formatType(type.type)}!`;
		case 'NamedType': return type.name.value;
		default: return assertNever(type, `Unknown type node kind: ${type == null ? null : type!.kind}`);
	}
}

const plugin: CodegenPlugin<GenerateOptions, GraphQLSchemaCodegenContextExtension> = {
	config: async (config) => {
		if (!isMaybeString(config.headerComment)) {
			throw new Error(`Expected headerComment to be a string, got: ${typeof config.headerComment}`);
		}
		return config as GenerateOptions;
	},
	generate: async (context, config) => {
		context.logger.info('Plugins/GraphQLResolver');

		const { headerComment = defaultHeaderComment } = config;
		let outputFile = createSourceFile('');

		const types: {
			[typeName: string]: { fieldName: string; fieldType: string }[];
		} = {}

		let currentTypeFields: { fieldName: string; fieldType: string }[];
		const visit: Visitor<ASTKindToNode> = {
			Directive: (node) => {
				context.logger.verbose(`@${node.name.value}`);
			},
			FieldDefinition: (node) => {
				context.logger.verbose(`Field: ${node.name.value}: ${formatType(node.type)}`);
				currentTypeFields.push({ fieldName: node.name.value, fieldType: formatType(node.type) });
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
				context.logger.debug(`Type: ${node.name.value}`);
				if (types[node.name.value] == null) {
					currentTypeFields = types[node.name.value] = [];
				} else {
					currentTypeFields = types[node.name.value];
				}
			},
			ObjectTypeExtension: (node) => {
				context.logger.debug(`Type extension: ${node.name.value}`);
				if (types[node.name.value] == null) {
					currentTypeFields = types[node.name.value] = [];
				} else {
					currentTypeFields = types[node.name.value];
				}
			}
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
				.map(
					([typeName, fields]) => generateObjectType(typeName, fields.map((field) => {
						const nullable = !field.fieldType.endsWith('!');
						const isList = field.fieldType.startsWith('[');
						const fieldType = isList ? field.fieldType.match(/(\w+)/g)?.[0] ?? '' : field.fieldType;

						return isList ? {
							fieldName: field.fieldName,
							listOf: {
								fieldName: field.fieldName,
								fieldType: fieldType.replace(/!/g, ''),
								nullable: !fieldType.endsWith('!'),
							},
							nullable: nullable,
						} : {
							fieldName: field.fieldName,
							fieldType: field.fieldType.replace(/[\[\]!]/g, ''),
							nullable: nullable,
						};
					}), undefined)),
		]);

		return printSourceFile(
			addHeaderComment(outputFile, headerComment),
			context.outputStream,
		);
	},
};

export = plugin;
