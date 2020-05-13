import { getModulePath } from '@zeroconf/codegen/Util';
import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';

export async function loadPlugin(importModuleStr: string): Promise<CodegenPlugin<any>> {
	const { importName, importPath } = getModulePath(importModuleStr);

	const pluginModule = await import(importPath);
	if (pluginModule == null || pluginModule[importName] == null) {
		throw new Error(`Plugin not found: ${importModuleStr}, did you forget to install the dependency.`);
	}
	return pluginModule[importName];
}
