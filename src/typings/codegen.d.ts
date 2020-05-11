type CodegenPlugin<TConfig extends {}> = {
	config: (rawConfig: any) => Promise<TConfig>;
	generate: (outputStream: import('stream').Writable, config: TConfig) => Promise<void>;
}

type Maybe<T> = T | null;
