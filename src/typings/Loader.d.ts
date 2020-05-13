import { CodegenContext } from '@zeroconf/codegen/Context';

export interface CodegenLoader {
	load(context: CodegenContext): Promise<void>;
}
