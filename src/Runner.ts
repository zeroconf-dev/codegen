import { Config } from '@zeroconf/codegen/Config';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { loadPlugin } from '@zeroconf/codegen/Plugin';

export function run({ generates, config: globalConfig }: Config) {
	return Object.entries(generates).reduce(async (previousOutput, [outputPath, { plugins , config: outputConfig }]) => {
		await previousOutput;
		const outputConfigMerged = {
			...globalConfig,
			...outputConfig,
		}
		const outputStream = createWriteStream(join(process.cwd(), outputPath));
		return Object.entries(plugins).reduce(async (prevPlugin, [pluginPath, pluginConfigRaw]) => {
			await prevPlugin;
			const pluginConfigMerged = {
				...outputConfigMerged,
				...pluginConfigRaw,
			}
			const plugin = await loadPlugin(pluginPath);
			const pluginConfig = await plugin.config(pluginConfigMerged);
			return plugin.generate(outputStream, pluginConfig);
		}, Promise.resolve());
	}, Promise.resolve());
}
