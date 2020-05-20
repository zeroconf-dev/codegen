import { ASTKindToNode, Visitor } from 'graphql';
import { CodegenContext } from '@zeroconf/codegen/Context';

declare enum PluginPhase {
	GraphQLEmit = 'graphql-emit',
	GraphQLVisit = 'graphql-visit',
}

interface RegisterContext {}

type CodegenPlugin<TPluginConfig extends {}, TContextPluginExtension = {}> = {
	config: (rawConfig: any) => Promise<TPluginConfig>;
	generate: (context: CodegenContext & TContextPluginExtension, pluginConfig: TPluginConfig) => Promise<void>;
	graphql?: {
		emit?: () => Promise<void>;
		visit?: Visitor<ASTKindToNode>;
	};
	load?: (context: CodegenContext & TContextPluginExtension) => Promise<void>;
};
