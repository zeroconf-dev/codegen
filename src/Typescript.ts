import * as ts from 'typescript';
import { basename } from 'path';
import { writeFile as writeFileCallback } from 'fs';
import { promisify } from 'util';

const writeFile = promisify(writeFileCallback);

export function createSourceFile(outputPath: string) {
	const fileName = basename(outputPath);
	return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest);
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

type Maybe<T> = T | null;

export const filterNonNull = <T>(arr: Maybe<T>[]): T[] => arr.filter(e => e != null) as T[];
