import { OutputConfig } from '@zeroconf/codegen/Config';
import { createContext, loadSourceFile } from '@zeroconf/codegen/GraphQL';
import { PluginContext, PluginGenerator, PluginValidateConfigContext } from '@zeroconf/codegen/Runner';
import { DocumentNode, printSchema } from 'graphql';
import { join } from 'path';

export interface GenerateOptions {
	outputConfig: OutputConfig;
}

export async function* plugin(ctx: PluginContext): PluginGenerator {
	ctx.yieldUntil(ctx.phases.validateConfig);
	yield;

	const config = await ctx.validate.runConfigValidation<GenerateOptions>(validateConfig);

	ctx.yieldUntil(ctx.phases.loadInput);
	yield;

	const documents = await ctx.load.loadInputFiles(async (inputStream) => {
		const docs: Promise<DocumentNode>[] = [];
		for await (const filePath of inputStream) {
			docs.push(loadSourceFile(join(config.outputConfig.directory, filePath.toString())));
		}
		return Promise.all(docs);
	});

	ctx.yieldUntil(ctx.phases.generate);
	yield;

	const schemaContext = createContext(documents, null as any);

	ctx.yieldUntil(ctx.phases.emit);
	yield;

	await ctx.emit.writeOutput(async ({ outputFileStream }) => {
		outputFileStream.write(printSchema(schemaContext.schema));
	});

	ctx.yieldUntil(ctx.phases.cleanup);
	yield;
}

async function validateConfig(
	_ctx: PluginValidateConfigContext,
	rawConfig: unknown,
	outputConfig: OutputConfig,
): Promise<GenerateOptions> {
	return {
		...(rawConfig as any),
		outputConfig,
	} as GenerateOptions;
}
