import { Filesystem } from '@zeroconf/codegen/Filesystem';
import { ExportType, plugin } from '@zeroconf/codegen/Plugins/ExportDirectory';
import { CodegenPlugin, runPlugins } from '@zeroconf/codegen/Runner';

describe('ExportDirectory', () => {
	describe('Config', () => {
		test('empty config throws', async () =>
			expect(
				runPlugins(
					new Filesystem(),
					{
						directory: '',
					},
					{
						directory: '',
						debug: false,
						globPattern: '*.ts',
						outputPattern: '',
					},
					{
						ExportDirectory: {
							globalConfig: {
								outputPath: '',
							},
							pluginConfig: {},
							plugin: plugin as CodegenPlugin,
						},
					},
				),
			).rejects.toMatchInlineSnapshot(`
						Array [
						  Array [
						    "ExportDirectory",
						    Symbol(Codegen.PluginPhase.Setup),
						    [TypeError: Missing exportType option in config],
						  ],
						]
					`));

		test('valid config does not throw', () =>
			expect(
				runPlugins(
					new Filesystem(),
					{
						directory: '/tmp/nowhere',
					},
					{
						debug: false,
						directory: '/tmp/nowhere',
						globPattern: '*.ts',
						outputPattern: 'output',
					},
					{
						ExportDirectory: {
							globalConfig: {
								outputPath: 'output',
							},
							pluginConfig: {
								exportType: ExportType.ReExport,
								importPrefix: '',
							},
							plugin: plugin as CodegenPlugin,
						},
					},
				),
			).resolves.toBeUndefined());
	});
});
