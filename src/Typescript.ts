import * as ts from 'typescript';
import { basename } from 'path';
import { writeFile as writeFileCallback } from 'fs';
import { promisify } from 'util';
import { ModulePath } from '@zeroconf/codegen/Util';

const writeFile = promisify(writeFileCallback);

export function createSourceFile(outputPath: string) {
	const fileName = basename(outputPath);
	return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest);
}

export function createImportDeclarationFromModulePath({ defaultImport, exportName, importName, importPath }: ModulePath) {
	return ts.createImportDeclaration(
		undefined,
		undefined,
		ts.createImportClause(
			defaultImport
				? ts.createIdentifier(importName)
				: importName === 'default' && exportName != null
				? ts.createIdentifier(exportName)
				: undefined,
			defaultImport
				? undefined
				: ts.createNamedImports([ts.createImportSpecifier(undefined, ts.createIdentifier(importName))]),
			false,
		),
		ts.createStringLiteral(importPath),
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

export function addHeaderComment(sourceFile: ts.SourceFile, headerComment: string) {
	if (sourceFile.statements.length === 0) {
		const compiledHeader = headerComment.split('\n').map(comment => `// ${comment}`).join('\n');
		sourceFile = ts.updateSourceFile(
			sourceFile,
			compiledHeader,
			ts.createTextChangeRange(
				ts.createTextSpan(0, 0),
				compiledHeader.length,
			),
		);
	} else {
		headerComment.split('\n').forEach(comment => {
			ts.addSyntheticLeadingComment(sourceFile.statements[0], ts.SyntaxKind.SingleLineCommentTrivia, ` ${comment}`, true);
		});
	}
	return sourceFile;
}

export const defaultHeaderComment = `THIS FILE IS GENERATED BY @zeroconf/codegen
DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.`;

type Maybe<T> = T | null;

export const filterNonNull = <T>(arr: Maybe<T>[]): T[] => arr.filter(e => e != null) as T[];
