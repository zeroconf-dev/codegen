import { OutputConfig } from '@zeroconf/codegen/Config';
import { AnsiLogger, createLoggerFromEnvironment, Level } from 'ansi-logger';
import { yellow } from 'cli-color';

interface CodegenContextOptions {
	inputStream: NodeJS.ReadableStream;
	logLevel?: Level,
	outputConfig: OutputConfig;
	outputStream: NodeJS.WritableStream;
}

export class CodegenContext {
	public readonly logger: AnsiLogger<any>;
	public readonly outputConfig: OutputConfig;
	public readonly inputStream: NodeJS.ReadableStream;
	public readonly outputStream: NodeJS.WritableStream;

	public constructor(options: CodegenContextOptions) {
		this.logger = createLoggerFromEnvironment({
			group: 'codegen',
			groupColor: yellow,
			logFormat: 'TEXT',
			logLevel: options.logLevel,
		})
		this.inputStream = options.inputStream;
		this.outputConfig = options.outputConfig;
		this.outputStream = options.outputStream;
	}
}
