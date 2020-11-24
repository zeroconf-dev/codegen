import { Config, OutputConfig, OutputConfigReadonly } from '@zeroconf/codegen/Config';
import { CodegenContext } from '@zeroconf/codegen/Context';
import { Filesystem } from '@zeroconf/codegen/Filesystem';
import { loadLoader } from '@zeroconf/codegen/Loader';
import { loadPlugin } from '@zeroconf/codegen/Plugin';
import { Level } from 'ansi-logger';
import * as fg from 'fast-glob';
import { createWriteStream } from 'fs';
import { join } from 'path';

export const SetupPhase = Symbol('Codegen.PluginPhase.Setup');
export const ValidateConfigPhase = Symbol('Codegen.PluginPhase.ValidateConfig');
export const LoadInputPhase = Symbol('Codegen.PluginPhase.LoadInput');
export const GeneratePhase = Symbol('Codegen.PluginPhase.Generate');
export const EmitPhase = Symbol('Codegen.PluginPhase.Emit');
export const CleanupPhase = Symbol('Codegen.PluginPhase.Cleanup');
export const DonePhase = Symbol('Codegen.PluginPhase.Done');
export const FailedState = Symbol('Codegen.PluginState.Failed');

const YieldToken = Symbol('Codegen.Plugin.YieldToken');

export type PluginPhase =
	| typeof SetupPhase
	| typeof ValidateConfigPhase
	| typeof LoadInputPhase
	| typeof GeneratePhase
	| typeof EmitPhase
	| typeof CleanupPhase
	| typeof DonePhase
	| typeof FailedState;

const pluginContext = {
	phases: {
		validateConfig: ValidateConfigPhase,
		loadInput: LoadInputPhase,
		generate: GeneratePhase,
		emit: EmitPhase,
		cleanup: CleanupPhase,
	},
} as const;

export type PluginGenerator = AsyncGenerator<void, void, typeof YieldToken>;
export type CodegenPlugin = (context: PluginContext<any>) => PluginGenerator;

type PluginMap = {
	[pluginName: string]: {
		globalConfig: {
			outputPath: string;
		};
		pluginConfig: any;
		plugin: CodegenPlugin;
	};
};

type PluginControl = {
	[pluginName: string]: {
		context: PluginContext<PluginPhase>;
		generator: PluginGenerator;
		resumeOn: PluginPhase;
	};
};

// Don't include DonePhase in this list.
const phases = [
	SetupPhase,
	ValidateConfigPhase,
	LoadInputPhase,
	GeneratePhase,
	EmitPhase,
	CleanupPhase,
] as readonly PluginPhase[];

const getNextPhase = (phase: PluginPhase): PluginPhase => {
	const idx = phases.indexOf(phase);
	return idx === -1 ? DonePhase : phases[idx + 1] || DonePhase;
};

interface PluginContextBase<TPhase extends PluginPhase> {
	readonly currentPhase: PluginPhase;
	readonly phases: Readonly<typeof pluginContext['phases']>;

	yieldUntil<TPluginPhase extends PluginNextPhases<TPhase>>(
		this: PluginContext<TPhase>,
		phase: TPluginPhase,
	): asserts this is PluginContext<TPluginPhase>;
}

interface PluginSetupContext {
	runSetup(): Promise<void>;
}
export interface PluginValidateConfigContext {
	runConfigValidation<TConfig>(
		validator: (
			ctx: PluginValidateConfigContext,
			pluginConfig: unknown,
			outputConfig: OutputConfig,
		) => Promise<TConfig>,
	): Promise<TConfig>;
	assertEnum<TEnum extends string | number>(
		value: unknown,
		validator: (value: unknown) => Maybe<string>,
	): asserts value is TEnum;
	assertNotNull<T>(value: T, errorMessage: string): asserts value is NonNullable<T>;
	assertObject(value: unknown, errorMessage: string): asserts value is Record<string, unknown>;
	assertString(value: unknown, errorMessage: string): asserts value is string;
	assertArray(value: unknown, errorMessage: string): asserts value is any[];
	assertStringArray(value: unknown, errorMessage: string): asserts value is string[];
	assertMaybeStringArray(value: unknown, errorMessage: string): asserts value is Maybe<string[]> | undefined;
	assertUndefined(value: unknown, errorMessage: string): asserts value is undefined;
	assertMaybeString(value: unknown, errorMessage: string): asserts value is Maybe<string> | undefined;
	assertBoolean(value: unknown, errorMessage: string): asserts value is boolean;
	assertMaybeBoolean(value: unknown, errorMessage: string): asserts value is Maybe<boolean> | undefined;
}
interface PluginLoadInputContext {
	loadInputFiles<R = void>(loadFn: (inputStream: Stream<string>) => Promise<R>): Promise<R>;
}
interface PluginGenerateContext {
	runGenerateCode(): Promise<void>;
}
interface PluginEmitContext {
	writeOutput(
		emitter: (args: {
			inputFilePath: string;
			outputFileStream: NodeJS.WritableStream;
			outputFilePath: string;
		}) => Promise<void>,
	): Promise<void>;
}
interface PluginCleanupContext {
	runCleanup(): Promise<void>;
}

export type PluginContext<TPhase extends PluginPhase = typeof SetupPhase> = PluginContextBase<TPhase> &
	(TPhase extends typeof SetupPhase
		? { readonly setup: PluginSetupContext }
		: TPhase extends typeof ValidateConfigPhase
		? { readonly validate: PluginValidateConfigContext }
		: TPhase extends typeof LoadInputPhase
		? { readonly load: PluginLoadInputContext }
		: TPhase extends typeof GeneratePhase
		? { readonly generate: PluginGenerateContext }
		: TPhase extends typeof EmitPhase
		? { readonly emit: PluginEmitContext }
		: TPhase extends typeof CleanupPhase
		? { readonly cleanup: PluginCleanupContext }
		: {});

export type PluginValidateConfigPhaseContext = PluginContext<typeof ValidateConfigPhase>;

export function newContext(
	filesystem: Filesystem,
	globalConfig: GlobalConfig,
	outputConfig: OutputConfig,
	pluginConfig: unknown,
): PluginContext {
	return new (class {
		public readonly globalConfig = globalConfig;
		public readonly outputConfig = outputConfig;
		public readonly phases = pluginContext.phases;

		private readonly config: Maybe<{}> = null;
		private _currentPhase = SetupPhase;
		private readonly filesystem = filesystem;

		public get currentPhase() {
			return this._currentPhase;
		}

		public get setup() {
			return this;
		}

		public get validate(): PluginValidateConfigContext {
			return this;
		}

		public get load(): PluginLoadInputContext {
			return this;
		}

		public get generate(): PluginGenerateContext {
			return this;
		}

		public get emit(): PluginEmitContext {
			return this;
		}

		public get cleanup() {
			return this;
		}

		public async runSetup() {
			if (this._currentPhase !== SetupPhase) {
				throw new Error('runSetup() can only be called in the SetupPhase');
			}
		}

		public async runConfigValidation<TConfig extends {}>(
			validator: (
				context: PluginValidateConfigContext,
				config: unknown,
				outputConfig: OutputConfig,
			) => Promise<TConfig>,
		): Promise<TConfig> {
			if (this._currentPhase !== ValidateConfigPhase) {
				throw new Error('runConfigValidation() can only be called in the ValidateConfigPhase');
			}
			(this as any).config = await validator(this.validate, pluginConfig, this.outputConfig);
			return this.config as TConfig;
		}

		public loadInputFiles<R = void>(loadFn: (inputStream: Stream<string>) => Promise<R>): Promise<R> {
			if (this._currentPhase !== LoadInputPhase) {
				throw new Error('runLoadInput() can only be called in the LoadInputPhase');
			}

			return loadFn(
				this.filesystem.loadFiles(
					this.outputConfig.directory,
					this.outputConfig.globPattern,
					this.outputConfig.outputPattern,
				),
			);
		}

		public async runGenerateCode() {
			if (this._currentPhase !== GeneratePhase) {
				throw new Error('runGenerateCode() can only be called in the GeneratePhase');
			}
		}

		public async writeOutput(
			emitter: (args: {
				inputFilePath: string;
				outputFileStream: NodeJS.WritableStream;
				outputFilePath: string;
			}) => Promise<void>,
		): Promise<void> {
			if (this._currentPhase !== EmitPhase) {
				throw new Error('runEmitCode() can only be called in the EmitPhase');
			}

			const outputStreamsMap = this.filesystem.createOutputStreams(
				this.outputConfig.directory,
				this.outputConfig.globPattern,
			);

			await Promise.all(
				Array.from(outputStreamsMap.entries()).map(([inputFilePath, [outputFilePath, outputFileStream]]) =>
					outputFilePath.endsWith(this.outputConfig.outputPattern)
						? emitter({ inputFilePath, outputFileStream, outputFilePath: outputFilePath })
						: Promise.resolve<void>(undefined),
				),
			);
		}

		public async runCleanup() {
			if (this._currentPhase !== CleanupPhase) {
				throw new Error('runCleanup() can only be called in the CleanupPhase');
			}
		}

		public assertEnum<TEnum extends string | number>(
			value: unknown,
			validator: (value: unknown) => Maybe<string>,
		): asserts value is TEnum {
			const errorMessage = validator(value);
			if (errorMessage != null) {
				throw new TypeError(errorMessage);
			}
		}

		public assertNotNull<T>(value: T, errorMessage: string): asserts value is NonNullable<T> {
			if (value == null) {
				throw new TypeError(errorMessage);
			}
		}

		public assertObject(value: unknown, errorMessage: string): asserts value is Record<string, unknown> {
			if (value == null || typeof value !== 'object') {
				throw new TypeError(errorMessage);
			}
		}

		public assertString(value: unknown, errorMessage: string): asserts value is string {
			if (typeof value !== 'string') {
				throw new TypeError(errorMessage);
			}
		}

		public assertArray(value: unknown, errorMessage: string): asserts value is any[] {
			if (!Array.isArray(value)) {
				throw new TypeError(errorMessage);
			}
		}

		public assertStringArray(value: unknown, errorMessage: string): asserts value is string[] {
			this.assertArray(value, errorMessage);
			value.forEach((val) => this.assertString(val, errorMessage));
		}

		public assertMaybeStringArray(
			value: unknown,
			errorMessage: string,
		): asserts value is Maybe<string[]> | undefined {
			if (value == null) {
				return;
			}
			this.assertStringArray(value, errorMessage);
		}

		public assertUndefined(value: unknown, errorMessage: string): asserts value is undefined {
			if (typeof value !== 'undefined') {
				throw new TypeError(errorMessage);
			}
		}

		public assertMaybeString(value: unknown, errorMessage: string): asserts value is Maybe<string> | undefined {
			if (value == null) {
				return;
			}
			this.assertString(value, errorMessage);
		}

		public assertBoolean(value: unknown, errorMessage: string): asserts value is boolean {
			if (typeof value !== 'boolean') {
				throw new TypeError(errorMessage);
			}
		}

		public assertMaybeBoolean(value: unknown, errorMessage: string): asserts value is Maybe<boolean> | undefined {
			if (value == null) {
				return;
			}
			this.assertBoolean(value, errorMessage);
		}

		public yieldUntil(phase: PluginPhase) {
			this._currentPhase = phase;
		}
	})() as PluginContext<typeof SetupPhase>;
}

type PluginNextPhases<TPluginPhase extends PluginPhase> = TPluginPhase extends typeof SetupPhase
	? typeof ValidateConfigPhase | typeof LoadInputPhase | typeof GeneratePhase | typeof EmitPhase | typeof CleanupPhase
	: TPluginPhase extends typeof ValidateConfigPhase
	? typeof LoadInputPhase | typeof GeneratePhase | typeof EmitPhase | typeof CleanupPhase
	: TPluginPhase extends typeof LoadInputPhase
	? typeof GeneratePhase | typeof EmitPhase | typeof CleanupPhase
	: TPluginPhase extends typeof GeneratePhase
	? typeof EmitPhase | typeof CleanupPhase
	: TPluginPhase extends typeof EmitPhase
	? typeof CleanupPhase
	: never;

function createContexts(
	filesystem: Filesystem,
	globalConfig: GlobalConfig,
	outputConfig: OutputConfig,
	pluginConfig: any,
) {
	const initialPhase = SetupPhase as
		| typeof SetupPhase
		| typeof ValidateConfigPhase
		| typeof LoadInputPhase
		| typeof GeneratePhase
		| typeof EmitPhase
		| typeof CleanupPhase;

	return {
		currentPhase: initialPhase,
		context: newContext(filesystem, globalConfig, outputConfig, pluginConfig),
	};
}

export interface GlobalConfig {
	directory: string;
	globPattern?: string;
}

export async function runPlugins(
	filesystem: Filesystem,
	globalConfig: GlobalConfig,
	outputConfig: OutputConfig,
	plugins: PluginMap,
): Promise<void> {
	const pluginControl = Object.keys(plugins).reduce((carry, pluginName) => {
		const { plugin, pluginConfig } = plugins[pluginName];
		const { context } = createContexts(filesystem, globalConfig, outputConfig, pluginConfig);
		carry[pluginName] = {
			context: context,
			generator: plugin(context),
			resumeOn: SetupPhase,
		};
		return carry;
	}, {} as PluginControl);

	let currentPhase = SetupPhase;
	const errors = [] as [string, PluginPhase, Error][];
	for (const phase of phases) {
		currentPhase = phase;
		await Promise.all(
			Object.entries(pluginControl)
				.filter(([, { resumeOn }]) => resumeOn === currentPhase)
				.map(async ([pluginName, { context, generator, resumeOn }]) => {
					try {
						const result = await generator.next();
						if (result.done) {
							pluginControl[pluginName]['resumeOn'] = DonePhase;
						} else {
							pluginControl[pluginName]['resumeOn'] =
								currentPhase === context.currentPhase
									? getNextPhase(context.currentPhase)
									: context.currentPhase;
						}
					} catch (e) {
						console.error(`Error running plugin: ${pluginName} in phase: ${resumeOn.toString()}`);
						console.error(e.message);
						errors.push([pluginName, resumeOn, e]);
						pluginControl[pluginName]['resumeOn'] = FailedState;
					}
				}),
		);
	}

	if (errors.length > 0) {
		return Promise.reject(errors);
	}
}

export async function run({ generates, config: globalConfig }: Config): Promise<void> {
	const filesystem = new Filesystem();

	await Promise.all(
		Object.entries(generates).map(async ([outputPattern, { plugins, config: outputConfig }]) => {
			const pluginMap: PluginMap = {};
			await Promise.all(
				Object.entries(plugins).reduce((carry, [pluginPath, pluginConfigRaw]) => {
					carry.push(
						loadPlugin<CodegenPlugin>(pluginPath).then(
							(plugin) =>
								(pluginMap[pluginPath] = {
									pluginConfig: pluginConfigRaw,
									plugin,
								} as any),
						),
					);
					return carry;
				}, [] as Promise<CodegenPlugin>[]),
			);

			const globPattern = (globalConfig ?? {}).globPattern ?? outputConfig.globPattern;
			if (globPattern == null) {
				throw new Error(
					`Missing globPattern in either the global config, or the output config for outputPattern: ${outputPattern}`,
				);
			}

			return runPlugins(
				filesystem,
				{
					directory: __dirname,
					...globalConfig,
				},
				{
					debug: Boolean(outputConfig.debug),
					directory: __dirname,
					globPattern: globPattern,
					...outputConfig,
					outputPattern: outputPattern,
				},
				pluginMap,
			);
		}),
	);
}

export function runOld({ generates, config: globalConfig }: Config): Promise<void> {
	return Object.entries(generates).reduce(
		async (previousOutput, [outputPath, { plugins, config: outputConfig, loaders }]) => {
			await previousOutput;

			const context = await createGenerateContext(
				{
					outputConfig: outputConfig as OutputConfigReadonly,
					outputPath: outputPath,
					loaders: loaders,
				},
				globalConfig ?? {},
			);

			return Object.entries(plugins).reduce(async (prevPlugin, [pluginPath, pluginConfigRaw]) => {
				await prevPlugin;
				const pluginConfigMerged = {
					...context.outputConfig,
					...pluginConfigRaw,
				};

				const plugin = await loadPlugin(pluginPath);
				const pluginConfig = await plugin.config(pluginConfigMerged);

				return plugin.generate(context, pluginConfig);
			}, Promise.resolve());
		},
		Promise.resolve(),
	);
}

export async function createGenerateContext(
	{
		outputPath,
		outputStream,
		outputConfig,
		loaders,
		logLevel,
	}: {
		loaders?: string[];
		outputConfig: OutputConfigReadonly;
		logLevel?: Level;
	} & (
		| { outputPath: string; outputStream?: undefined }
		| { outputPath?: undefined; outputStream: NodeJS.WritableStream }
	),
	// eslint-disable-next-line @typescript-eslint/ban-types
	globalConfig: {},
): Promise<CodegenContext> {
	const outputConfigMerged = {
		directory: process.cwd(),
		debug: false,
		...globalConfig,
		...outputConfig,
	};

	const { globPattern } = outputConfigMerged;
	if (globPattern == null) {
		throw new Error('Missing globPattern');
	}

	const resolvedOutputStream =
		outputStream == null ? createWriteStream(join(process.cwd(), outputPath as string)) : outputStream;
	const inputStream = fg.stream(globPattern, {
		cwd: outputConfigMerged.directory,
		globstar: true,
	});

	const context = new CodegenContext({
		outputConfig: outputConfigMerged as OutputConfig,
		inputStream: inputStream,
		logLevel: logLevel,
		outputStream: resolvedOutputStream,
	});

	if (loaders != null) {
		await Promise.all(
			loaders.map(async (loaderImportPath) => {
				const plugin = await loadLoader(loaderImportPath);
				return plugin.load(context);
			}),
		);
	}

	return context;
}
