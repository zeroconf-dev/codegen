import { AnsiLogger } from 'ansi-logger';
import { readFile as readFileNode, PathLike } from 'fs';
import {
	ASTNode,
	buildASTSchema,
	concatAST,
	DirectiveDefinitionNode,
	DirectiveNode,
	DocumentNode,
	EnumTypeDefinitionNode,
	EnumTypeExtensionNode,
	EnumValueDefinitionNode,
	FieldDefinitionNode,
	GraphQLSchema,
	InputObjectTypeDefinitionNode,
	InputObjectTypeExtensionNode,
	InputValueDefinitionNode,
	InterfaceTypeDefinitionNode,
	InterfaceTypeExtensionNode,
	Kind,
	ListTypeNode,
	NamedTypeNode,
	NameNode,
	NonNullTypeNode,
	ObjectTypeDefinitionNode,
	ObjectTypeExtensionNode,
	parse,
	printError,
	ScalarTypeDefinitionNode,
	ScalarTypeExtensionNode,
	SchemaDefinitionNode,
	SchemaExtensionNode,
	Source,
	UnionTypeDefinitionNode,
	UnionTypeExtensionNode,
	validateSchema,
	visit,
	Visitor,
} from 'graphql';
import { isNode } from 'graphql/language/ast';
import { EnterLeave, getVisitFn, ASTVisitor } from 'graphql/language/visitor';
import { promisify } from 'util';
import { pipe, map, filter } from '@zeroconf/codegen/Util';

const readFile = promisify(readFileNode);

export interface SchemaASTKindToNode {
	Directive: DirectiveNode;
	DirectiveDefinition: DirectiveDefinitionNode;
	Document: DocumentNode;
	EnumTypeDefinition: EnumTypeDefinitionNode;
	EnumTypeExtension: EnumTypeExtensionNode;
	EnumValueDefinition: EnumValueDefinitionNode;
	FieldDefinition: FieldDefinitionNode;
	InputObjectTypeDefinition: InputObjectTypeDefinitionNode;
	InputObjectTypeExtension: InputObjectTypeExtensionNode;
	InputValueDefinition: InputValueDefinitionNode;
	InterfaceTypeDefinition: InterfaceTypeDefinitionNode;
	InterfaceTypeExtension: InterfaceTypeExtensionNode;
	ListType: ListTypeNode;
	Name: NameNode;
	NamedType: NamedTypeNode;
	NonNullType: NonNullTypeNode;
	ObjectTypeDefinition: ObjectTypeDefinitionNode;
	ObjectTypeExtension: ObjectTypeExtensionNode;
	ScalarTypeDefinition: ScalarTypeDefinitionNode;
	ScalarTypeExtension: ScalarTypeExtensionNode;
	SchemaDefinition: SchemaDefinitionNode;
	SchemaExtension: SchemaExtensionNode;
	UnionTypeDefinition: UnionTypeDefinitionNode;
	UnionTypeExtension: UnionTypeExtensionNode;
}

export type SchemaASTNode = SchemaASTKindToNode[keyof SchemaASTKindToNode];

export type SchemaASTVisitor = SchemaVisitor;
export type SchemaVisitor = SchemaEnterLeaveVisitor | SchemaShapeMapVisitor;

type SchemaEnterLeaveVisitor = EnterLeave<
	SchemaVisitFn<SchemaASTNode> | { [K in keyof SchemaASTKindToNode]?: SchemaVisitFn<SchemaASTKindToNode[K]> }
>;

type SchemaShapeMapVisitor = {
	[K in keyof SchemaASTKindToNode]?: SchemaVisitFn<SchemaASTKindToNode[K]> | EnterLeave<SchemaVisitFn<SchemaASTNode>>;
};

/**
 * A visitor is comprised of visit functions, which are called on each node
 * during the visitor's traversal.
 */
export type SchemaVisitFn<TVisitedNode extends SchemaASTNode> = (
	/** The current node being visiting.*/
	node: TVisitedNode,
	typeInfo: SchemaTypeInfo<TVisitedNode>,
) => any;

type FieldParentDefinitionNode =
	| InputObjectTypeDefinitionNode
	| InputObjectTypeExtensionNode
	| InterfaceTypeDefinitionNode
	| InterfaceTypeExtensionNode
	| ObjectTypeDefinitionNode
	| ObjectTypeExtensionNode;

type NameParentDefinitionNode =
	| DirectiveDefinitionNode
	| DirectiveNode
	| EnumTypeDefinitionNode
	| EnumTypeExtensionNode
	| FieldDefinitionNode
	| InputObjectTypeDefinitionNode
	| InputObjectTypeExtensionNode
	| InputValueDefinitionNode
	| InterfaceTypeDefinitionNode
	| InterfaceTypeExtensionNode
	| NamedTypeNode
	| ObjectTypeDefinitionNode
	| ObjectTypeExtensionNode
	| ScalarTypeDefinitionNode
	| ScalarTypeExtensionNode
	| UnionTypeDefinitionNode
	| UnionTypeExtensionNode;

type NamedTypeParentDefinitionNode =
	| FieldDefinitionNode
	| InterfaceTypeDefinitionNode
	| InterfaceTypeExtensionNode
	| InputValueDefinitionNode
	| ListTypeNode
	| NonNullTypeNode
	| ObjectTypeDefinitionNode
	| ObjectTypeExtensionNode
	| UnionTypeDefinitionNode
	| UnionTypeExtensionNode;

type NonNullTypeParentDefinitionNode = FieldDefinitionNode | InputValueDefinitionNode | ListTypeNode;

type ListTypeParentDefinitionNode =
	| FieldDefinitionNode
	| InputObjectTypeDefinitionNode
	| NonNullTypeNode
	| ListTypeNode;

type DirectiveParentDefinitionNode =
	| EnumTypeDefinitionNode
	| EnumTypeExtensionNode
	| EnumValueDefinitionNode
	| FieldDefinitionNode
	| InputObjectTypeDefinitionNode
	| InputObjectTypeExtensionNode
	| InputValueDefinitionNode
	| InterfaceTypeDefinitionNode
	| InterfaceTypeExtensionNode
	| ObjectTypeDefinitionNode
	| ObjectTypeExtensionNode
	| ScalarTypeDefinitionNode
	| ScalarTypeExtensionNode
	| SchemaDefinitionNode
	| SchemaExtensionNode
	| UnionTypeDefinitionNode
	| UnionTypeExtensionNode;

type EnumValueParentDefinitionNode = EnumTypeDefinitionNode | EnumTypeExtensionNode;

type InputValueParentDefinitionNode =
	| DirectiveDefinitionNode
	| FieldDefinitionNode
	| InputObjectTypeDefinitionNode
	| InputObjectTypeExtensionNode;

/**
 * Given a valid AST, this map resolves valid parent nodes from any Schema AST Node.
 */
interface SchemaASTParentNode {
	Directive: DirectiveParentDefinitionNode;
	DirectiveDefinition: null;
	Document: null;
	EnumTypeDefinition: null;
	EnumTypeExtension: null;
	EnumValueDefinition: EnumValueParentDefinitionNode;
	FieldDefinition: FieldParentDefinitionNode;
	InputObjectTypeDefinition: null;
	InputObjectTypeExtension: null;
	InputValueDefinition: InputValueParentDefinitionNode;
	InterfaceTypeDefinition: null;
	InterfaceTypeExtension: null;
	ListType: ListTypeParentDefinitionNode;
	Name: NameParentDefinitionNode;
	NamedType: NamedTypeParentDefinitionNode;
	NonNullType: NonNullTypeParentDefinitionNode;
	ObjectTypeDefinition: null;
	ObjectTypeExtension: null;
	ScalarTypeDefinition: null;
	ScalarTypeExtension: null;
	SchemaDefinition: null;
	SchemaExtension: null;
	UnionTypeDefinition: null;
	UnionTypeExtension: null;
}

/**
 * Given a valid AST, this map resolves valid parent type definition nodes from any Schema AST Node.
 * Note, not all Schema AST Nodes lives as descendant to a type definition node.
 */
interface SchemaASTParentTypeNode {
	Directive: ParentTypeDefinitionNodes;
	DirectiveDefinition: null;
	Document: null;
	EnumTypeDefinition: null;
	EnumTypeExtension: null;
	EnumValueDefinition: EnumValueParentDefinitionNode;
	FieldDefinition: FieldParentDefinitionNode;
	InputObjectTypeDefinition: null;
	InputObjectTypeExtension: null;
	InputValueDefinition: null;
	InterfaceTypeDefinition: null;
	InterfaceTypeExtension: null;
	ListType: ParentTypeDefinitionNodes;
	Name: EnumTypeDefinitionNodes | ParentTypeDefinitionNodes | UnionTypeDefinitionNodes;
	NamedType: ParentTypeDefinitionNodes | UnionTypeDefinitionNodes;
	NonNullType: ParentTypeDefinitionNodes;
	ObjectTypeDefinition: null;
	ObjectTypeExtension: null;
	ScalarTypeDefinition: null;
	ScalarTypeExtension: null;
	SchemaDefinition: null;
	SchemaExtension: null;
	UnionTypeDefinition: null;
	UnionTypeExtension: null;
}

/**
 * Resolve the node at a single level higher up in the AST
 * given a valid tree.
 */
type SchemaParentNode<TSchemaASTNode extends SchemaASTNode> = TSchemaASTNode['kind'] extends keyof SchemaASTParentNode
	? SchemaASTParentNode[TSchemaASTNode['kind']]
	: Maybe<SchemaASTNode>;

type SchemaParentType<
	TSchemaASTNode extends SchemaASTNode
> = TSchemaASTNode['kind'] extends keyof SchemaASTParentTypeNode
	? SchemaASTParentTypeNode[TSchemaASTNode['kind']]
	: Maybe<SchemaASTNode>;

export type EnumTypeDefinitionNodes = EnumTypeDefinitionNode | EnumTypeExtensionNode;

export type InterfaceTypeDefinitionNodes = InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode;

export type InputObjectTypeDefinitionNodes = InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode;

export type ObjectTypeDefinitionNodes = ObjectTypeDefinitionNode | ObjectTypeExtensionNode;

export type UnionTypeDefinitionNodes = UnionTypeDefinitionNode | UnionTypeExtensionNode;

export type ParentTypeDefinitionNodes =
	| InterfaceTypeDefinitionNodes
	| InputObjectTypeDefinitionNodes
	| ObjectTypeDefinitionNodes;

class SchemaTypeInfo<TSchemaASTNode extends SchemaASTNode> {
	public readonly schema: GraphQLSchema;
	public readonly document: DocumentNode;
	public readonly logger: AnsiLogger<any>;

	private readonly enumDefinitionMap: Map<string, EnumTypeDefinitionNodes[]> = new Map();
	private readonly enumValueMap: Map<string, EnumValueDefinitionNode[]> = new Map();
	private readonly fieldDefinitionMap: Map<string, FieldDefinitionNode> = new Map();
	private readonly fieldFromParentDefinitionMap: Map<string, Map<string, FieldDefinitionNode>> = new Map();
	private readonly inputObjectDefinitionMap: Map<string, InputObjectTypeDefinitionNodes[]> = new Map();
	private readonly interfaceDefinitionMap: Map<string, InterfaceTypeDefinitionNodes[]> = new Map();
	private readonly objectDefinitionMap: Map<string, ObjectTypeDefinitionNodes[]> = new Map();
	private readonly unionDefinitionMap: Map<string, UnionTypeDefinitionNodes[]> = new Map();
	private readonly objectTypeInterfacesMap: Map<string, Set<string>> = new Map();

	private readonly parentNodeStack: SchemaASTNode[] = [];
	private parentTypeDefinition: Maybe<ParentTypeDefinitionNodes> = null;

	public constructor(document: DocumentNode, schema: GraphQLSchema, logger: AnsiLogger<any>) {
		this.document = document;
		this.schema = schema;
		this.logger = logger;
	}

	public get fieldDefinitions(): ReadonlyMap<string, FieldDefinitionNode> {
		return this.fieldDefinitionMap;
	}

	public get enumDefinitions(): ReadonlyMap<string, EnumTypeDefinitionNodes[]> {
		return this.enumDefinitionMap;
	}

	public get interfaceDefinitions(): ReadonlyMap<string, InterfaceTypeDefinitionNodes[]> {
		return this.interfaceDefinitionMap;
	}

	public get inputObjectDefinitions(): ReadonlyMap<string, InputObjectTypeDefinitionNodes[]> {
		return this.inputObjectDefinitionMap;
	}

	public get objectDefinitions(): ReadonlyMap<string, ObjectTypeDefinitionNodes[]> {
		return this.objectDefinitionMap;
	}

	public get parentNode(): SchemaParentNode<TSchemaASTNode> {
		return this.getParentNode<TSchemaASTNode>();
	}

	public get parentType() {
		return this.parentTypeDefinition as SchemaParentType<TSchemaASTNode>;
	}

	public getEnumValues(enumTypeName: string): readonly EnumValueDefinitionNode[] {
		const enumValues = this.enumValueMap.get(enumTypeName);
		if (enumValues == null) {
			throw new Error(`No enum values found for enumType: ${enumTypeName}`);
		}
		return enumValues;
	}

	public getFieldDefinitionMap(parentTypeName: string): ReadonlyMap<string, FieldDefinitionNode> {
		const fieldDefinitionMap = this.fieldFromParentDefinitionMap.get(parentTypeName);
		if (fieldDefinitionMap == null) {
			throw new Error(`No field map found for parentType: ${parentTypeName}`);
		}
		return fieldDefinitionMap;
	}

	public getFieldDefinitions(parentTypeName: string): IterableIterator<FieldDefinitionNode> {
		return this.getFieldDefinitionMap(parentTypeName).values();
	}

	public getObjectTypeDefinitionMap(typeName: string) {
		const objectDefinitionMap = this.objectDefinitionMap.get(typeName);
		if (objectDefinitionMap == null) {
			throw new Error(`No object type definitions found for type: ${typeName}`);
		}
		return objectDefinitionMap;
	}


	public getObjectTypeDefinitions(typeName: string): IterableIterator<ObjectTypeDefinitionNodes> {
		return this.getObjectTypeDefinitionMap(typeName).values();
	}

	public getObjectTypeDescription(typeName: string) {
		return Array.from(
			pipe(
				this.getObjectTypeDefinitions(typeName),
				map(d => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.description?.value),
				filter(c => typeof c === 'string')
			)
		).join('\n').trim() || undefined;
	}

	public getInterfacesForObjectType(typeName: string): ReadonlySet<string> {
		return this.objectTypeInterfacesMap.get(typeName) ?? new Set();
	}

	public getInterfaceTypeDefinitionMap(typeName: string) {
		const interfaceDefinitionMap = this.interfaceDefinitionMap.get(typeName);
		if (interfaceDefinitionMap == null) {
			throw new Error(`No interface type definitions found for type: ${typeName}`);
		}
		return interfaceDefinitionMap;
	}

	public getInterfaceTypeDefinitions(typeName: string): IterableIterator<InterfaceTypeDefinitionNodes> {
		return this.getInterfaceTypeDefinitionMap(typeName).values();
	}

	public getInterfaceTypeDescription(typeName: string) {
		return Array.from(
			pipe(
				this.getInterfaceTypeDefinitions(typeName),
				map(d => d.kind === Kind.INTERFACE_TYPE_DEFINITION && d.description?.value),
				filter(c => typeof c === 'string')
			)
		).join('\n').trim() || undefined;
	}

	public getTypeDescription(typeName: string) {
		return this.isInterfaceType(typeName)
			? this.getInterfaceTypeDescription(typeName)
			: this.getObjectTypeDescription(typeName);
	}

	public isQueryType(typeName: string): boolean {
		const queryType = this.schema.getQueryType();
		return (queryType == null && typeName === 'Query') || (queryType != null && queryType.name === typeName);
	}

	public isMutationType(typeName: string): boolean {
		const mutationType = this.schema.getMutationType();
		return (
			(mutationType == null && typeName === 'Mutation') ||
			(mutationType != null && mutationType.name === typeName)
		);
	}

	public isSubscriptionType(typeName: string): boolean {
		const subscriptionType = this.schema.getSubscriptionType();
		return (
			(subscriptionType == null && typeName === 'Subscription') ||
			(subscriptionType != null && subscriptionType.name === typeName)
		);
	}

	public isEnumType(typeName: string): boolean {
		return this.enumDefinitionMap.has(typeName);
	}

	public isInterfaceType(typeName: string): boolean {
		return this.interfaceDefinitionMap.has(typeName);
	}

	public isInputObjectType(typeName: string): boolean {
		return this.inputObjectDefinitionMap.has(typeName);
	}

	public isObjectType(typeName: string): boolean {
		return this.objectDefinitionMap.has(typeName);
	}

	public isUnionType(typeName: string): boolean {
		return this.unionDefinitionMap.has(typeName);
	}

	private getParentNode<TASTNode extends SchemaASTNode>(): SchemaParentNode<TASTNode> {
		if (this.parentNodeStack.length === 0) {
			return null as any;
		}
		return this.parentNodeStack[this.parentNodeStack.length - 1] as any;
	}

	public enter(node: SchemaASTNode) {
		switch (node.kind) {
			case Kind.ENUM_TYPE_DEFINITION:
			case Kind.ENUM_TYPE_EXTENSION: {
				const enumName = node.name.value;
				const enumDefinitions = this.enumDefinitionMap.get(enumName) ?? [];
				this.enumDefinitionMap.set(enumName, enumDefinitions);
				break;
			}

			case Kind.ENUM_VALUE_DEFINITION: {
				const enumValueName = node.name.value;

				const enumType = this.getParentNode<EnumValueDefinitionNode>();
				if (enumType == null) {
					throw new TypeError(`Invalid type, enum value definition: ${enumValueName}, with parent`);
				}

				const enumTypeName = enumType.name.value;
				const qualifiedEnumValueName = `${enumTypeName}.${enumValueName}`;

				const enumValues = this.enumValueMap.get(enumTypeName);
				if (enumValues == null) {
					throw new TypeError(
						`Invalid type, enum type ${enumTypeName} not found in values map, for enum value definition: ${qualifiedEnumValueName}`,
					);
				}
				enumValues.push(node);
				break;
			}

			case Kind.FIELD_DEFINITION: {
				const fieldName = node.name.value;

				const parent = this.getParentNode<FieldDefinitionNode>();
				if (parent == null) {
					throw new TypeError(`Invalid type, field definition: ${fieldName}, without parent`);
				}
				const parentTypeName = parent.name.value;
				const qualifiedFieldName = `${parentTypeName}.${fieldName}`;

				const fieldFromParentDefinitions = this.fieldFromParentDefinitionMap.get(parentTypeName);
				if (fieldFromParentDefinitions == null) {
					throw new TypeError(
						`Invalid type, field definition: ${qualifiedFieldName}, without field from parent map.`,
					);
				}

				if (this.fieldDefinitionMap.has(qualifiedFieldName) || fieldFromParentDefinitions.has(fieldName)) {
					throw new TypeError(`Invalid type, duplicate field definition: ${qualifiedFieldName}`);
				}

				fieldFromParentDefinitions.set(fieldName, node);
				this.fieldDefinitionMap.set(qualifiedFieldName, node);

				break;
			}

			case Kind.INPUT_OBJECT_TYPE_DEFINITION:
			case Kind.INPUT_OBJECT_TYPE_EXTENSION: {
				const typeName = node.name.value;

				const inputObjectDefinitions = this.inputObjectDefinitionMap.get(typeName) ?? [];
				inputObjectDefinitions.push(node);
				this.inputObjectDefinitionMap.set(typeName, inputObjectDefinitions);

				this.fieldFromParentDefinitionMap.set(
					typeName,
					this.fieldFromParentDefinitionMap.get(typeName) ?? new Map(),
				);

				this.parentTypeDefinition = node;
				break;
			}

			case Kind.INTERFACE_TYPE_DEFINITION:
			case Kind.INTERFACE_TYPE_EXTENSION: {
				const typeName = node.name.value;

				const interfaceDefinitions = this.interfaceDefinitionMap.get(typeName) ?? [];
				interfaceDefinitions.push(node);
				this.interfaceDefinitionMap.set(typeName, interfaceDefinitions);

				this.fieldFromParentDefinitionMap.set(
					typeName,
					this.fieldFromParentDefinitionMap.get(typeName) ?? new Map(),
				);

				if (node.interfaces != null) {
					const interfaces = this.objectTypeInterfacesMap.get(typeName) ?? new Set();
					node.interfaces.forEach((iface) => interfaces.add(iface.name.value));
					this.objectTypeInterfacesMap.set(typeName, interfaces);
				}

				this.parentTypeDefinition = node;
				break;
			}

			case Kind.OBJECT_TYPE_DEFINITION:
			case Kind.OBJECT_TYPE_EXTENSION: {
				const typeName = node.name.value;

				const objectDefinitions = this.objectDefinitionMap.get(typeName) ?? [];
				objectDefinitions.push(node);
				this.objectDefinitionMap.set(typeName, objectDefinitions);

				this.fieldFromParentDefinitionMap.set(
					typeName,
					this.fieldFromParentDefinitionMap.get(typeName) ?? new Map(),
				);

				if (node.interfaces != null) {
					const interfaces = this.objectTypeInterfacesMap.get(typeName) ?? new Set();
					node.interfaces.forEach((iface) => interfaces.add(iface.name.value));
					this.objectTypeInterfacesMap.set(typeName, interfaces);
				}

				this.parentTypeDefinition = node;
				break;
			}

			case Kind.UNION_TYPE_DEFINITION:
			case Kind.UNION_TYPE_EXTENSION: {
				const typeName = node.name.value;

				const unionDefinitions = this.unionDefinitionMap.get(typeName) ?? [];
				unionDefinitions.push(node);
				this.unionDefinitionMap.set(typeName, unionDefinitions);

				// Unions does not act as parent types for object / interface definition nodes
				// only for NamedType nodes, so we don't set et as parent type definition node.
				// this.parentTypeDefinition = node;
				break;
			}
		}
	}

	public leave(node: ASTNode) {
		switch (node.kind) {
			case Kind.FIELD_DEFINITION: {
				break;
			}
			case Kind.INPUT_OBJECT_TYPE_DEFINITION:
			case Kind.INPUT_OBJECT_TYPE_EXTENSION: {
				this.parentTypeDefinition = null;
				break;
			}
			case Kind.INTERFACE_TYPE_DEFINITION:
			case Kind.INTERFACE_TYPE_EXTENSION: {
				this.parentTypeDefinition = null;
				break;
			}
			case Kind.OBJECT_TYPE_DEFINITION:
			case Kind.OBJECT_TYPE_EXTENSION: {
				this.parentTypeDefinition = null;
				break;
			}
		}
	}
}

type PrivateSchemaTypeInfo<TSchemaASTNode extends SchemaASTNode> = Omit<
	SchemaTypeInfo<TSchemaASTNode>,
	'parentNodeStack'
> & { readonly parentNodeStack: SchemaASTNode[] };

function visitWithTypeInfo(
	typeInfo: PrivateSchemaTypeInfo<SchemaASTNode>,
	visitor: SchemaASTVisitor,
): Visitor<SchemaASTKindToNode> {
	return {
		enter(node: SchemaASTNode) {
			typeInfo.enter(node);
			const fn = getVisitFn(visitor as ASTVisitor, node.kind, false) as Maybe<SchemaVisitFn<SchemaASTNode>>;
			if (typeof fn === 'function') {
				const result = fn.apply(visitor, [node, (typeInfo as unknown) as SchemaTypeInfo<SchemaASTNode>]);
				typeInfo.parentNodeStack.push(node);
				if (result !== undefined) {
					typeInfo.leave(node);
					if (isNode(result)) {
						typeInfo.enter(result as SchemaASTNode);
						typeInfo.parentNodeStack.push(result as SchemaASTNode);
					}
				}
				return result;
			} else {
				(typeInfo as any).parentNodeStack.push(node);
			}
		},
		leave(node: SchemaASTNode) {
			const fn = getVisitFn(visitor as ASTVisitor, node.kind, true) as Maybe<SchemaVisitFn<SchemaASTNode>>;
			const result =
				typeof fn === 'function'
					? fn.apply(visitor, [node, (typeInfo as unknown) as SchemaTypeInfo<SchemaASTNode>])
					: undefined;
			typeInfo.leave(node);
			typeInfo.parentNodeStack.pop();
			return result;
		},
	};
}

class GenerateSchemaContext {
	public readonly schema: GraphQLSchema;
	public readonly document: DocumentNode;
	public readonly logger: AnsiLogger<any>;
	public readonly typeInfo: SchemaTypeInfo<SchemaASTNode>;

	public constructor(documents: DocumentNode | DocumentNode[], logger: AnsiLogger<any>) {
		this.document = Array.isArray(documents) ? concatAST(documents) : documents;
		this.schema = buildASTSchema(this.document);
		this.logger = logger;
		this.typeInfo = new SchemaTypeInfo<SchemaASTNode>(this.document, this.schema, logger);
	}

	public validateSchema() {
		return validateSchema(this.schema);
	}

	public visitSchema(visitor: SchemaASTVisitor) {
		this.document.definitions.forEach((def) => {
			visit(
				def,
				visitWithTypeInfo(
					(this.typeInfo as unknown) as PrivateSchemaTypeInfo<SchemaASTNode>,
					visitor,
				) as ASTVisitor,
			);
		});
	}
}

export interface GraphQLSchemaCodegenContextExtension {
	graphql: {
		schemaContext: GenerateSchemaContext;
	};
}

export type { GenerateSchemaContext };

export async function loadSourceFile(sourcePath: PathLike): Promise<DocumentNode> {
	return parse(new Source((await readFile(sourcePath)).toString(), sourcePath.toString()));
}

export function createContext(documents: DocumentNode[] | DocumentNode, logger: AnsiLogger<any>) {
	const context = new GenerateSchemaContext(documents, logger);

	const errors = validateSchema(context.schema);
	if (errors.length > 0) {
		throw new Error(errors.map((error) => printError(error)).join('\n\n'));
	}

	return context;
}
