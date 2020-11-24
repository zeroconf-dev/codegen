import { Filesystem } from '@zeroconf/codegen/Filesystem';
import { PluginGenerator, PluginContext, runPlugins, CodegenPlugin } from '@zeroconf/codegen/Runner';

describe('Plugin runner', () => {
	test('setup phase is run', async () => {
		expect.assertions(2);

		async function* plugin(ctx: PluginContext): PluginGenerator {
			ctx.yieldUntil(ctx.phases.validateConfig);
			expect(true).toBe(true);
			yield;
		}

		return expect(() =>
			runPlugins(
				new Filesystem(),
				{
					directory: '',
				},
				{
					debug: false,
					directory: '',
					globPattern: '',
					outputPattern: '',
				},
				{
					plugin: {
						globalConfig: {
							outputPath: '',
						},
						pluginConfig: {},
						plugin: plugin as CodegenPlugin,
					},
				},
			),
		).not.toThrow();
	});
});
