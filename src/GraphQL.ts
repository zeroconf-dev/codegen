import { readFile as readFileNode, PathLike } from 'fs';
import { promisify } from 'util';
import {
	ASTNode,
	buildASTSchema,
	concatAST,
	DefinitionNode,
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
import { EnterLeave, getVisitFn, ASTVisitor } from 'graphql/language/visitor';
import { isNode } from 'graphql/language/ast';
import { AnsiLogger } from 'ansi-logger';

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
export type SchemaVisitor =
	| SchemaEnterLeaveVisitor
	| SchemaShapeMapVisitor;

type SchemaEnterLeaveVisitor =
	EnterLeave<
		| SchemaVisitFn<SchemaASTNode>
		| { [K in keyof SchemaASTKindToNode]?: SchemaVisitFn<SchemaASTKindToNode[K]> }
	>;

type SchemaShapeMapVisitor = {
	[K in keyof SchemaASTKindToNode]?:
		| SchemaVisitFn<SchemaASTKindToNode[K]>
		| EnterLeave<SchemaVisitFn<SchemaASTNode>>;
};

/**
 * A visitor is comprised of visit functions, which are called on each node
 * during the visitor's traversal.
 */
export type SchemaVisitFn<TVisitedNode extends SchemaASTNode> = (
	/** The current node being visiting.*/
	node: TVisitedNode,
	typeInfo: SchemaTypeInfo<TVisitedNode>
) => any;

type FieldParentDefinitionNode =
	| InputObjectTypeDefinitionNode
	| InputObjectTypeExtensionNode
	| InterfaceTypeDefinitionNode
	| InterfaceTypeExtensionNode
	| ObjectTypeDefinitionNode
	| ObjectTypeExtensionNode
	;

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
	| UnionTypeExtensionNode
	;

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
	| UnionTypeExtensionNode
	;

type NonNullTypeParentDefinitionNode =
	| FieldDefinitionNode
	| InputValueDefinitionNode
	| ListTypeNode
	;

type ListTypeParentDefinitionNode =
	| FieldDefinitionNode
	| InputObjectTypeDefinitionNode
	| NonNullTypeNode
	| ListTypeNode
	;

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
	| UnionTypeExtensionNode
	;

type EnumValueParentDefinitionNode =
	| EnumTypeDefinitionNode
	| EnumTypeExtensionNode
	;

type InputValueParentDefinitionNode =
	| DirectiveDefinitionNode
	| FieldDefinitionNode
	| InputObjectTypeDefinitionNode
	| InputObjectTypeExtensionNode
	;

interface SchemaASTParent {
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

type SchemaParentNode<TSchemaASTNode extends SchemaASTNode> =
	TSchemaASTNode['kind'] extends keyof SchemaASTParent
		? SchemaASTParent[TSchemaASTNode['kind']]
		: Maybe<SchemaASTNode>;

class SchemaTypeInfo<TSchemaASTNode extends SchemaASTNode> {
	public readonly schema: GraphQLSchema;
	public readonly document: DocumentNode;
	public readonly logger: AnsiLogger<any>;
	private readonly enumDefinitionMap: Map<string, (EnumTypeDefinitionNode | EnumTypeExtensionNode)[]> = new Map();
	private readonly fieldDefinitionMap: Map<string, FieldDefinitionNode> = new Map();
	private readonly interfaceDefinitionMap: Map<
		string,
		(InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode)[]
	> = new Map();
	private readonly objectDefinitionMap: Map<
		string,
		(ObjectTypeDefinitionNode | ObjectTypeExtensionNode)[]
	> = new Map();
	private readonly parentNodeStack: SchemaASTNode[] = [];
	private parentTypeDefinition: Maybe<
		| InputObjectTypeDefinitionNode
		| InputObjectTypeExtensionNode
		| InterfaceTypeDefinitionNode
		| InterfaceTypeExtensionNode
		| ObjectTypeDefinitionNode
		| ObjectTypeExtensionNode
	> = null;

	public constructor(document: DocumentNode, schema: GraphQLSchema, logger: AnsiLogger<any>) {
		this.document = document;
		this.schema = schema;
		this.logger = logger;
	}

	public get fieldDefinitions(): ReadonlyMap<string, FieldDefinitionNode> {
		return this.fieldDefinitionMap;
	}

	public get enumDefinitions(): ReadonlyMap<string, (EnumTypeDefinitionNode | EnumTypeExtensionNode)[]> {
		return this.enumDefinitionMap;
	}

	public get interfaceDefinitions(): ReadonlyMap<
		string,
		(InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode)[]
	> {
		return this.interfaceDefinitionMap;
	}

	public get objectDefinitions(): ReadonlyMap<string, (ObjectTypeDefinitionNode | ObjectTypeExtensionNode)[]> {
		return this.objectDefinitionMap;
	}

	public get parentNode(): SchemaParentNode<TSchemaASTNode> {
		return this.getParentNode<TSchemaASTNode>();
	}

	public get parentType() {
		return this.parentTypeDefinition as TSchemaASTNode extends FieldDefinitionNode
			? FieldParentDefinitionNode
			: Maybe<FieldParentDefinitionNode>;
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
			case Kind.FIELD_DEFINITION: {
				const fieldName = node.name.value;
				const parent = this.getParentNode<FieldDefinitionNode>();
				if (parent == null) {
					throw new TypeError(`Invalid type, field definition: ${fieldName}, without parent`);
				}
				const parentTypeName = parent.name.value;
				const qualifiedFieldName = `${parentTypeName}.${fieldName}`;
				if (this.fieldDefinitionMap.has(qualifiedFieldName)) {
					throw new TypeError(`Invalid type, duplicate field definition: ${qualifiedFieldName}`);
				}
				this.fieldDefinitionMap.set(qualifiedFieldName, node);
				break;
			}
			case Kind.INPUT_OBJECT_TYPE_DEFINITION:
			case Kind.INPUT_OBJECT_TYPE_EXTENSION: {
				this.parentTypeDefinition = node;
				break;
			}
			case Kind.INTERFACE_TYPE_DEFINITION:
			case Kind.INTERFACE_TYPE_EXTENSION: {
				const typeName = node.name.value;
				const interfaceDefinitions = this.interfaceDefinitionMap.get(typeName) ?? [];
				interfaceDefinitions.push(node);
				this.interfaceDefinitionMap.set(typeName, interfaceDefinitions);
				this.parentTypeDefinition = node;
				break;
			}
			case Kind.OBJECT_TYPE_DEFINITION:
			case Kind.OBJECT_TYPE_EXTENSION: {
				const typeName = node.name.value;
				const objectDefinitions = this.objectDefinitionMap.get(typeName) ?? [];
				objectDefinitions.push(node);
				this.objectDefinitionMap.set(typeName, objectDefinitions);
				this.parentTypeDefinition = node;
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

type PrivateSchemaTypeInfo<TSchemaASTNode extends SchemaASTNode>
	= Omit<SchemaTypeInfo<TSchemaASTNode>, 'parentNodeStack'> & { readonly parentNodeStack: SchemaASTNode[] };

function visitWithTypeInfo(
	typeInfo: PrivateSchemaTypeInfo<SchemaASTNode>,
	visitor: SchemaASTVisitor,
): Visitor<SchemaASTKindToNode> {
	return {
		enter(node: SchemaASTNode) {
			typeInfo.enter(node);
			const fn = getVisitFn(visitor as ASTVisitor, node.kind, false) as Maybe<SchemaVisitFn<SchemaASTNode>>;
			if (typeof fn === 'function') {
				const result = fn.apply(visitor, [node, typeInfo as unknown as SchemaTypeInfo<SchemaASTNode>]);
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
};

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
			visit(def, visitWithTypeInfo(this.typeInfo as unknown as PrivateSchemaTypeInfo<SchemaASTNode>, visitor) as ASTVisitor);
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
	return parse(new Source(
		(await readFile(sourcePath)).toString(),
		sourcePath.toString(),
	));
}

export function createContext(documents: DocumentNode[] | DocumentNode, logger: AnsiLogger<any>) {
	const context = new GenerateSchemaContext(documents, logger);

	const errors = validateSchema(context.schema);
	if (errors.length > 0) {
		throw new Error(errors.map(error => printError(error)).join('\n\n'));
	}

	return context;
}
