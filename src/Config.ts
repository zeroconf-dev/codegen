import { cosmiconfig, defaultLoaders } from 'cosmiconfig';

const explorer = cosmiconfig('codegen', {
	searchPlaces: ['codegen.yml', 'codegen.json', 'package.json'],
	loaders: {
		'.json': defaultLoaders['.json'],
		'.yaml': defaultLoaders['.yaml'],
		'.yml': defaultLoaders['.yaml'],
		noExt: defaultLoaders['.yaml'],
	},
});

export interface Config {
	config: {
		debug?: boolean
	}
	generates: {
		[outputPattern: string]: {
			config: {
				debug?: boolean
			};
			plugins: {
				[pluginImportPath: string]: {};
			};
		};
	};
}

export async function loadConfig(): Promise<Maybe<Config>> {
	const result = await explorer.search()
	return result == null ? null : result.config;
}
