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

export interface OutputConfigReadonly {
	debug?: boolean;
	/**
	 * Defaults to `process.cwd()`
	 */
	directory?: string;
	globPattern?: string;
}

export interface OutputConfig {
	debug: boolean;
	/**
	 * Defaults to `process.cwd()`
	 */
	directory: string;
	globPattern: string;
}

export interface Config {
	config: {
		debug?: boolean;
	};
	generates: {
		[outputPattern: string]: {
			config: OutputConfigReadonly;
			loaders?: string[];
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

export function isString(str: unknown): str is string {
	return typeof str === 'string';
}

export function isMaybeString(str: unknown): str is Maybe<string> {
	return str == null || isString(str);
}

export function isBoolean(str: unknown): str is boolean {
	return typeof str === 'boolean';
}

export function isMaybeBoolean(str: unknown): str is Maybe<boolean> {
	return str == null || isBoolean(str);
}

export function isNumber(str: unknown): str is number {
	return typeof str === 'number';
}

export function isMaybeNumber(str: unknown): str is Maybe<number> {
	return str == null || isNumber(str);
}
