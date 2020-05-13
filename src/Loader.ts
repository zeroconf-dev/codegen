import { getModulePath } from '@zeroconf/codegen/Util';
import { CodegenLoader } from '@zeroconf/codegen/typings/Loader';

export async function loadLoader(importModuleStr: string): Promise<CodegenLoader> {
	const { importName, importPath } = getModulePath(importModuleStr);

	const loaderModule = await import(importPath);
	if (loaderModule == null || loaderModule[importName] == null) {
		throw new Error(`Loader not found: ${importModuleStr}, did you forget to install the dependency.`);
	}
	return loaderModule[importName];
}
