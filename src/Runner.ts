import { Config, OutputConfig, OutputConfigReadonly } from '@zeroconf/codegen/Config';
import { CodegenContext } from '@zeroconf/codegen/Context';
import { loadLoader } from '@zeroconf/codegen/Loader';
import { loadPlugin } from '@zeroconf/codegen/Plugin';
import { Level } from 'ansi-logger';
import * as fg from 'fast-glob';
import { createWriteStream } from 'fs';
import { join } from 'path';

export function run({ generates, config: globalConfig }: Config): Promise<void> {
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
