import { compileOutputPath, isWildcardPath } from '@zeroconf/codegen/Util';
import * as fg from 'fast-glob';
import { createWriteStream } from 'fs';

type BaseDirectoryPath = string;
type InputPattern = string;
type InputFilePath = string;
type OutputPattern = string;
type OutputFilePath = string;

type Patterns = Map<BaseDirectoryPath, Map<InputPattern, Set<OutputPattern>>>;

export class Filesystem {
	protected readonly patterns: Patterns = new Map();
	protected readonly inputFilesMap: Map<BaseDirectoryPath, Map<InputPattern, Set<InputFilePath>>> = new Map();
	protected readonly outputFilesMap: Map<BaseDirectoryPath, Map<InputPattern, Set<OutputFilePath>>> = new Map();

	protected readonly inputFiles: Set<string> = new Set();
	protected readonly outputFiles: Set<string> = new Set();

	public registerPattern(workingDirectory: string, inputPattern: string, outputPattern: string): void {
		const patternMap = this.patterns.get(workingDirectory) ?? new Map<InputPattern, Set<OutputPattern>>();
		const outputPatterns = patternMap.get(inputPattern) ?? new Set<OutputPattern>();
		outputPatterns.add(outputPattern);
		patternMap.set(inputPattern, outputPatterns);
		this.patterns.set(workingDirectory, patternMap);
	}

	public loadFiles = async function* (
		this: Filesystem,
		workingDirectory: string,
		inputPattern: string,
		outputPattern: string,
	): Stream<string> {
		this.registerPattern(workingDirectory, inputPattern, outputPattern);

		const inputFilesMap = this.inputFilesMap.get(workingDirectory) ?? new Map<InputPattern, Set<InputFilePath>>();
		const inputFiles = inputFilesMap.get(inputPattern) ?? new Set<InputFilePath>();
		inputFilesMap.set(inputPattern, inputFiles);
		this.inputFilesMap.set(workingDirectory, inputFilesMap);

		const outputFilesMap =
			this.outputFilesMap.get(workingDirectory) ?? new Map<InputFilePath, Set<OutputPattern>>();
		const outputFiles = outputFilesMap.get(inputPattern) ?? new Set<OutputPattern>();
		outputFilesMap.set(inputPattern, outputFiles);
		this.outputFilesMap.set(workingDirectory, outputFilesMap);

		if (!isWildcardPath(outputPattern)) {
			const outputFilePath = compileOutputPath('', inputPattern, outputPattern);
			outputFiles.add(outputFilePath);
			this.outputFiles.add(outputFilePath);
		}

		for await (const filePath of fg.stream(inputPattern, {
			cwd: workingDirectory,
			globstar: true,
		})) {
			const inputFilePath = String(filePath);
			const outputFilePath = compileOutputPath(inputFilePath, inputPattern, outputPattern);

			inputFiles.add(inputFilePath);
			outputFiles.add(outputFilePath);

			this.inputFiles.add(inputFilePath);
			this.outputFiles.add(outputFilePath);

			yield inputFilePath;
		}
	};

	public createOutputStreams(
		workingDirectory: string,
		inputPattern: string,
	): Map<string, [OutputFilePath, NodeJS.WritableStream]> {
		const outputFilesMap = this.outputFilesMap.get(workingDirectory);
		if (outputFilesMap == null) {
			throw new Error(`Could not find input/output pattern map for working directory: ${workingDirectory}`);
		}

		const outputFiles = outputFilesMap.get(inputPattern);
		if (outputFiles == null) {
			throw new Error(
				`Could not find output pattern map for working directory: ${workingDirectory} and inputPattern: ${inputPattern}`,
			);
		}

		return Array.from(outputFiles.entries()).reduce((outputMap, [inputFilePath, outputFilePath]) => {
			outputMap.set(inputFilePath, [outputFilePath, createWriteStream(outputFilePath)]);
			return outputMap;
		}, new Map<InputFilePath, [OutputFilePath, NodeJS.WritableStream]>());
	}
}
