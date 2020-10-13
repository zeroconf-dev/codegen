import { compileOutputPath } from '@zeroconf/codegen/Util';
import { createWriteStream } from 'fs';
import * as fg from 'fast-glob';

export async function createOutputStreams(
	inputPattern: string,
	outputPattern: string,
	cwd = process.cwd(),
): Promise<Map<string, NodeJS.WritableStream>> {
	const result = new Map<string, NodeJS.WritableStream>();
	const inputStream = fg.stream(inputPattern, {
		cwd: cwd,
		globstar: true,
	});

	for await (const inputFilePath of inputStream) {
		const outputPath = compileOutputPath(String(inputFilePath), inputPattern, outputPattern);
		result.set(outputPath, createWriteStream(outputPath));
	}

	return result;
}
