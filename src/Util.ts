export interface ModulePath {
	defaultImport: boolean;
	exportName?: Maybe<string>;
	importName: string;
	importPath: string;
}

export function getModulePath(modulePathStr: string): ModulePath {
	const [importPath, importNameRaw] = modulePathStr.split('#');
	const first = importNameRaw[0];
	const last = importNameRaw[importNameRaw.length - 1];

	const defaultImportMarkers = first === '[' && last === ']';
	const importName = defaultImportMarkers
		? importNameRaw.substr(1, importNameRaw.length - 2)
		: importNameRaw;

	return {
		defaultImport: importNameRaw === 'default' || importNameRaw === '' || defaultImportMarkers,
		importName: importName ?? 'default',
		importPath: importPath,
	};
}

export const assertNever = (_obj: never, msg: string): never => {
	throw new Error(msg);
}

export const capitalize = (...parts: string[]): string =>
	parts.map(part =>
		part.length === 0
			? ''
			: part.charAt(0).toLocaleUpperCase() + part.substring(1),
	).join('');
