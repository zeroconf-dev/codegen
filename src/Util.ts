export interface ModulePath {
	defaultImport: boolean;
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
