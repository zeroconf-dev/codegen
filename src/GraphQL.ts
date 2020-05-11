import { readFile as readFileNode, PathLike } from 'fs';
import { promisify } from 'util';
import { Source, parse, DocumentNode, concatAST, buildASTSchema, validateSchema, printError, GraphQLSchema, TypeInfo, Visitor, visitWithTypeInfo, ASTKindToNode, visit } from 'graphql';

const readFile = promisify(readFileNode);

class GenerateSchemaContext {
	public readonly schema: GraphQLSchema;
	public readonly document: DocumentNode;
	public readonly typeInfo: TypeInfo;

	public constructor(documents: DocumentNode | DocumentNode[]) {
		this.document = Array.isArray(documents) ? concatAST(documents) : documents;
		this.schema = buildASTSchema(this.document);
		this.typeInfo = new TypeInfo(this.schema);
	}

	public validateSchema() {
		return validateSchema(this.schema);
	}

	public visitSchema(visitor: Visitor<ASTKindToNode>) {
		this.document.definitions.forEach(def => visit(def, visitWithTypeInfo(this.typeInfo, visitor)));
	}
}

export async function loadSourceFile(sourcePath: PathLike): Promise<DocumentNode> {
	return parse(new Source(
		(await readFile(sourcePath)).toString(),
		sourcePath.toString(),
	));
}

export function createContext(documents: DocumentNode[] | DocumentNode) {
	const context = new GenerateSchemaContext(documents);

	const errors = validateSchema(context.schema);
	if (errors.length > 0) {
		throw new Error(errors.map(error => printError(error)).join('\n\n'));
	}

	return context;
}
