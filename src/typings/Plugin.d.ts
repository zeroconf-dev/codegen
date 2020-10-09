import { ASTKindToNode, Visitor } from 'graphql';
import { CodegenContext } from '@zeroconf/codegen/Context';

declare enum PluginPhase {
	GraphQLEmit = 'graphql-emit',
	GraphQLVisit = 'graphql-visit',
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RegisterContext {}

// eslint-disable-next-line @typescript-eslint/ban-types
type CodegenPlugin<TPluginConfig extends {}, TContextPluginExtension = {}> = {
	config: (rawConfig: any) => Promise<TPluginConfig>;
	generate: (context: CodegenContext & TContextPluginExtension, pluginConfig: TPluginConfig) => Promise<void>;
	graphql?: {
		emit?: () => Promise<void>;
		visit?: Visitor<ASTKindToNode>;
	};
	load?: (context: CodegenContext & TContextPluginExtension) => Promise<void>;
};
