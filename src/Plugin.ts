import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import { getModulePath } from '@zeroconf/codegen/Util';

export async function loadPlugin<
	TPlugin extends CodegenPlugin<any> | import('@zeroconf/codegen/Runner').CodegenPlugin = CodegenPlugin<any>
>(importModuleStr: string): Promise<TPlugin> {
	const { importName, importPath } = getModulePath(importModuleStr);

	const pluginModule = await import(importPath);
	if (pluginModule == null || pluginModule[importName] == null) {
		throw new Error(`Plugin not found: ${importModuleStr}, did you forget to install the dependency.`);
	}
	return pluginModule[importName];
}
