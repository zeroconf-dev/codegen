import { ModulePath } from '@zeroconf/codegen/Util';
import { writeFile as writeFileCallback } from 'fs';
import * as ts from 'typescript';
import { promisify } from 'util';

const writeFile = promisify(writeFileCallback);

export function createSourceFile(): ts.SourceFile {
	return ts.factory.createSourceFile([], ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
}

export function createImportDeclarationFromModulePath({
	defaultImport,
	exportName,
	importName,
	importPath,
}: ModulePath): ts.ImportDeclaration {
	return ts.factory.createImportDeclaration(
		undefined,
		undefined,
		ts.factory.createImportClause(
			false,
			defaultImport
				? ts.factory.createIdentifier(importName)
				: importName === 'default' && exportName != null
				? ts.factory.createIdentifier(exportName)
				: undefined,
			defaultImport
				? undefined
				: ts.factory.createNamedImports([ts.factory.createImportSpecifier(undefined, ts.factory.createIdentifier(importName))]),
		),
		ts.factory.createStringLiteral(importPath),
	);
}

export function printSourceFile(sourceFile: ts.SourceFile, outputStream?: NodeJS.WritableStream): Promise<void> {
	const printer = ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
		noEmitHelpers: true,
		omitTrailingSemicolon: false,
		removeComments: false,
	});

	if (outputStream == null) {
		return writeFile(sourceFile.fileName, printer.printFile(sourceFile));
	} else {
		return new Promise((resolve, reject) => {
			outputStream.write(printer.printFile(sourceFile), (err) => {
				err == null ? resolve() : reject(err);
			});
		});
	}
}

export function addHeaderComment(sourceFile: ts.SourceFile, headerComment: string): ts.SourceFile {
	if (sourceFile.statements.length === 0) {
		const compiledHeader = headerComment
			.split('\n')
			.map((comment) => `// ${comment}`)
			.join('\n');
		sourceFile = ts.updateSourceFile(
			sourceFile,
			compiledHeader,
			ts.createTextChangeRange(ts.createTextSpan(0, 0), compiledHeader.length),
		);
	} else {
		headerComment.split('\n').forEach((comment) => {
			ts.addSyntheticLeadingComment(
				sourceFile.statements[0],
				ts.SyntaxKind.SingleLineCommentTrivia,
				` ${comment}`,
				true,
			);
		});
	}
	return sourceFile;
}

export function addNodeCommentBlock<TNode extends ts.Node>(comment: Maybe<string> | undefined, node: TNode): TNode {
	const trimmed = comment == null ? null : comment.trim() || null;
	if (trimmed == null) {
		return node;
	}

	ts.addSyntheticLeadingComment(
		node,
		ts.SyntaxKind.MultiLineCommentTrivia,
		`*\n${trimmed
			.split('\n')
			.map((s) => ` * ${s}`)
			.join('\n')}\n *`,
		true,
	);

	return node;
}

export const defaultHeaderComment = `THIS FILE IS GENERATED BY @zeroconf/codegen
DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.`;
