import { Config, OutputConfig, OutputConfigReadonly } from '@zeroconf/codegen/Config';
import { CodegenContext } from '@zeroconf/codegen/Context';
import { loadLoader } from '@zeroconf/codegen/Loader';
import { loadPlugin } from '@zeroconf/codegen/Plugin';
import { Level } from 'ansi-logger';
import * as fg from 'fast-glob';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { resolve } from 'dns';

export function run({ generates, config: globalConfig }: Config) {
	return Object.entries(generates).reduce(
		async (previousOutput, [outputPath, { plugins, config: outputConfig, loaders }]) => {
			await previousOutput;

			const context = await createGenerateContext(
				{
					outputConfig: outputConfig as OutputConfigReadonly,
					outputPath: outputPath,
					loaders: loaders,
				},
				globalConfig,
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

const SetupPhase = Symbol('Codegen.PluginPhase.Setup');
const ValidateConfigPhase = Symbol('Codegen.PluginPhase.ValidateConfig');
const LoadInputPhase = Symbol('Codegen.PluginPhase.LoadInput');
const GeneratePhase = Symbol('Codegen.PluginPhase.Generate');
const EmitPhase = Symbol('Codegen.PluginPhase.Emit');
const CleanupPhase = Symbol('Codegen.PluginPhase.Cleanup');
const DonePhase = Symbol('Codegen.PluginPhase.Done');
const FailedPhase = Symbol('Codegen.PluginPhase.Failed');

type PluginPhase =
	| typeof SetupPhase
	| typeof ValidateConfigPhase
	| typeof LoadInputPhase
	| typeof GeneratePhase
	| typeof EmitPhase
	| typeof CleanupPhase
	| typeof DonePhase
	| typeof FailedPhase
	;

const pluginContext = {
	phases: {
		untilValidateConfig: ValidateConfigPhase,
		untilLoadInput: LoadInputPhase,
		untilGenerate: GeneratePhase,
		untilEmit: EmitPhase,
		untilCleanup: CleanupPhase,
	},
} as const;

type PluginPhaseToContext<TPhase extends PluginPhase> =
	TPhase extends typeof SetupPhase
		? PluginSetupConfigPhaseContext
		: TPhase extends typeof ValidateConfigPhase
		? PluginValidateConfigPhaseContext
		: TPhase extends typeof LoadInputPhase
		? PluginLoadInputPhaseContext
		: TPhase extends typeof GeneratePhase
		? PluginGeneratePhaseContext
		: TPhase extends typeof EmitPhase
		? PluginEmitPhaseContext
		: TPhase extends typeof CleanupPhase
		? PluginCleanupPhaseContext
		: PluginContext;

// interface PluginAsyncIterator<TPhase extends PluginPhase, TReturn = void, TNext = any> {
// 	next<TTPhase extends TPhase = TPhase>(...args: [] | [PluginPhaseToContext<TTPhase>]): Promise<IteratorResult<TTPhase, TReturn>>;
// 	return?<TTReturn extends TReturn = TReturn>(value?: TTReturn | PromiseLike<TTReturn>): Promise<IteratorResult<TPhase, TReturn>>;
// 	throw?(e?: any): Promise<IteratorResult<TPhase, TReturn>>;
// }

// interface PluginAsyncGenerator<TPhase extends PluginPhase, TReturn = any, TNext = unknown> extends PluginAsyncIterator<TPhase, TReturn, TNext> {
// 	next<TTPhase extends TPhase = TPhase>(...args: [] | [PluginPhaseToContext<TTPhase>]): Promise<IteratorResult<TTPhase, TReturn>>;
// 	return?<TTReturn extends TReturn = TReturn>(value?: TTReturn | PromiseLike<TTReturn>): Promise<IteratorResult<TPhase, TReturn>>;
// 	throw?(e?: any): Promise<IteratorResult<TPhase, TReturn>>;
// 	[Symbol.asyncIterator](): PluginAsyncGenerator<TPhase, TReturn, TNext>;
// }

// interface PluginAsyncGenerator<T extends PluginPhase, TReturn = void, TNext extends PluginPhaseToContext<PluginPhase> = PluginPhaseToContext<T>> {
// 	next<TPhase extends PluginPhase = T, TTNext extends PluginPhaseToContext<TPhase> = TNext>(...args: [] | [TTNext]): Promise<IteratorResult<TPhase, TReturn>>;
// 	return?(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<PluginPhase, TReturn>>;
// 	throw?(e?: any): Promise<IteratorResult<PluginPhase, TReturn>>;
// 	[Symbol.asyncIterator](): PluginAsyncGenerator<T, TReturn, TNext>;
// }

type PluginGenerator = AsyncGenerator<PluginPhase, void, PluginPhaseToContext<PluginPhase>>;

type PluginMap = {
	[pluginName: string]: (context: PluginSetupConfigPhaseContext) => PluginGenerator;
}

type PluginControl = {
	[pluginName: string]: {
		contexts: ReturnType<typeof createContexts>,
		generator: PluginGenerator;
		resumeOn: PluginPhase;
	}
}


const modulePlugins: PluginMap = {
	plugin1: plugin1,
	plugin2: plugin2,
	plugin3: plugin3,
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
}
abstract class PluginContext<TPhase extends PluginPhase = PluginPhase> {
	public abstract readonly currentPhase: TPhase;
	public abstract readonly untilNextPhase: PluginPhase;

	public readonly phases = pluginContext.phases;

	public toString() {
		return this.constructor.name;
	}
}
class PluginSetupConfigPhaseContext extends PluginContext<typeof SetupPhase> {
	public readonly currentPhase: typeof SetupPhase = SetupPhase;
	public readonly untilNextPhase: typeof ValidateConfigPhase = ValidateConfigPhase;

	public readonly setupContext: this;

	public constructor() {
		super();
		this.setupContext = this;
	}

	public runSetup() {}
}
class PluginValidateConfigPhaseContext extends PluginContext<typeof ValidateConfigPhase> {
	public readonly currentPhase: typeof ValidateConfigPhase = ValidateConfigPhase;
	public readonly untilNextPhase: typeof LoadInputPhase = LoadInputPhase;

	public readonly setupContext: PluginSetupConfigPhaseContext;
	public readonly validateConfigContext: this;

	public constructor(setupContext: PluginSetupConfigPhaseContext) {
		super();
		this.setupContext = setupContext;
		this.validateConfigContext = this;
	}

	public runValidateConfig() {}
}
class PluginLoadInputPhaseContext extends PluginContext<typeof LoadInputPhase> {
	public readonly currentPhase: typeof LoadInputPhase = LoadInputPhase;
	public readonly untilNextPhase: typeof GeneratePhase = GeneratePhase;

	public readonly setupContext: PluginSetupConfigPhaseContext;
	public readonly validateConfigContext: PluginValidateConfigPhaseContext;
	public readonly loadInputContext: this;

	public constructor(validateConfigContext: PluginValidateConfigPhaseContext) {
		super();
		this.setupContext = validateConfigContext.setupContext;
		this.validateConfigContext = validateConfigContext;
		this.loadInputContext = this;
	}

	public runLoadInput() {}
}
class PluginGeneratePhaseContext extends PluginContext<typeof GeneratePhase> {
	public readonly currentPhase: typeof GeneratePhase = GeneratePhase;
	public readonly untilNextPhase: typeof EmitPhase = EmitPhase;

	public readonly setupContext: PluginSetupConfigPhaseContext;
	public readonly validateConfigContext: PluginValidateConfigPhaseContext;
	public readonly loadInputContext: PluginLoadInputPhaseContext;
	public readonly generateContext: this;

	public constructor(loadInputContext: PluginLoadInputPhaseContext) {
		super();
		this.setupContext = loadInputContext.setupContext;
		this.validateConfigContext = loadInputContext.validateConfigContext;
		this.loadInputContext = loadInputContext;
		this.generateContext = this;
	}

	public runGenerate() {}
}
class PluginEmitPhaseContext extends PluginContext<typeof EmitPhase> {
	public readonly currentPhase: typeof EmitPhase = EmitPhase;
	public readonly untilNextPhase: typeof CleanupPhase = CleanupPhase;

	public readonly setupContext: PluginSetupConfigPhaseContext;
	public readonly validateConfigContext: PluginValidateConfigPhaseContext;
	public readonly loadInputContext: PluginLoadInputPhaseContext;
	public readonly generateContext: PluginGeneratePhaseContext;
	public readonly emitContext: this;

	public constructor(generateContext: PluginGeneratePhaseContext) {
		super();
		this.setupContext = generateContext.setupContext;
		this.validateConfigContext = generateContext.validateConfigContext;
		this.loadInputContext = generateContext.loadInputContext;
		this.generateContext = generateContext;
		this.emitContext = this;
	}

	public runEmit() {}
}
class PluginCleanupPhaseContext extends PluginContext<typeof CleanupPhase> {
	public readonly currentPhase: typeof CleanupPhase = CleanupPhase;
	public readonly untilNextPhase: typeof DonePhase = DonePhase;

	public readonly setupContext: PluginSetupConfigPhaseContext;
	public readonly validateConfigContext: PluginValidateConfigPhaseContext;
	public readonly loadInputContext: PluginLoadInputPhaseContext;
	public readonly generateContext: PluginGeneratePhaseContext;
	public readonly emitContext: PluginEmitPhaseContext;
	public readonly cleanupContext: this;

	public constructor(emitContext: PluginEmitPhaseContext) {
		super();
		this.setupContext = emitContext.setupContext;
		this.validateConfigContext = emitContext.validateConfigContext;
		this.loadInputContext = emitContext.loadInputContext;
		this.generateContext = emitContext.generateContext;
		this.emitContext = emitContext;
		this.cleanupContext = this;
	}

	public runCleanup() {}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* plugin1(context: PluginSetupConfigPhaseContext): PluginGenerator {
	console.log(`plugin1: setting up...`);
	yield context.phases.untilGenerate;
	console.log(`plugin1: generating...`);
	yield context.phases.untilEmit;
	console.log(`plugin1: emitting...`);
}
async function* plugin2(context: PluginSetupConfigPhaseContext): PluginGenerator {
	console.log(`plugin2: setting up...`);
	await sleep(1000);
	const a = [yield context.phases.untilValidateConfig];
	console.log(`plugin2: validating config...`);
	await sleep(1000);
	yield context.phases.untilLoadInput;
	console.log(`plugin2: loading input...`);
	await sleep(1000);
	try {
		yield context.phases.untilGenerate;
		console.log(`plugin2: generating...`);
		await sleep(1000);
		throw new Error('Failed generating...');
		yield context.phases.untilEmit;
		console.log(`plugin2: emitting...`);
		await sleep(1000);
	} catch (e) {
		console.error(`plugin2: ${e.message}`);
	} finally {
		yield context.phases.untilCleanup;
		console.log(`plugin2: cleaning up...`)
		await sleep(1000);
	}
}
async function* plugin3(context: PluginSetupConfigPhaseContext): PluginGenerator {
	console.log(`plugin3: setting up...`);
	yield context.phases.untilEmit;
	console.log(`plugin3: emitting...`);
	throw new Error('Could not emit');
}

function createContexts() {
	const setupContext = new PluginSetupConfigPhaseContext();
	const validateConfigContext = new PluginValidateConfigPhaseContext(setupContext);
	const loadInputContext = new PluginLoadInputPhaseContext(validateConfigContext);
	const generateContext = new PluginGeneratePhaseContext(loadInputContext);
	const emitContext = new PluginEmitPhaseContext(generateContext);
	const cleanupContext = new PluginCleanupPhaseContext(emitContext);

	const initialPhase = SetupPhase as typeof SetupPhase | typeof ValidateConfigPhase | typeof LoadInputPhase | typeof GeneratePhase | typeof EmitPhase | typeof CleanupPhase

	return {
		currentPhase: initialPhase,
		[SetupPhase]: setupContext,
		[ValidateConfigPhase]: validateConfigContext,
		[LoadInputPhase]: loadInputContext,
		[GeneratePhase]: generateContext,
		[EmitPhase]: emitContext,
		[CleanupPhase]: cleanupContext,
	};
}

async function runPlugins(plugins: PluginMap) {
	const pluginControl = Object.keys(plugins).reduce((carry, pluginName) => {
		const contexts = createContexts();
		carry[pluginName] = { contexts: contexts, resumeOn: SetupPhase, generator: plugins[pluginName](contexts[SetupPhase]) };
		return carry;
	}, {} as PluginControl);

	let currentPhase = SetupPhase;
	for (const phase of phases) {
		currentPhase = phase;
		await Promise.all(
			Object.entries(pluginControl)
				.filter(([, { resumeOn }]) => resumeOn === currentPhase)
				.map(async ([pluginName, { contexts, generator, resumeOn }]) => {
					try {
						const result = await generator.next(contexts[resumeOn as typeof SetupPhase] as any);
						if (result.done) {
							pluginControl[pluginName]['resumeOn'] = DonePhase;
						} else {
							pluginControl[pluginName]['resumeOn'] = result.value ?? getNextPhase(phase);
						}
					} catch (e) {
						console.error(`Error running plugin: ${pluginName} in phase: ${resumeOn.toString()}`);
						console.error(e.message);
						pluginControl[pluginName]['resumeOn'] = FailedPhase;
					}
				}));
	}
}


runPlugins(modulePlugins).then(() => {
	console.log('Done');
}, (e) => {
	console.error(e);
	process.exit(1);
});
