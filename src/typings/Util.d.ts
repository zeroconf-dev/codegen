type Maybe<T> = T | null;
type MaybePromise<T> = T | Promise<T>;

type Stream<T> = AsyncGenerator<T, void, void>;

type PipeOperator<TInput = unknown, TResult = TInput> = (iterable: Iterable<TInput>) => Iterable<TResult>;

type PipeResult<TInput, TPipeOperators extends readonly any[]> = TPipeOperators extends { length: 0 }
	? Iterable<TInput>
	: // eslint-disable-next-line @typescript-eslint/no-unused-vars
	TPipeOperators extends [...infer _, infer TResult]
	? Iterable<TResult>
	: never;

type PreviousPipeOperator<TPipeOperators extends readonly any[], TKey, TInput> = TKey extends keyof [
	TInput,
	...TPipeOperators
]
	? [TInput, ...TPipeOperators][TKey]
	: never;

type PipeOperators<TInput, TPipeOperators extends readonly any[]> = {
	[TKey in keyof TPipeOperators]: PipeOperator<
		PreviousPipeOperator<TPipeOperators, TKey, TInput>,
		TPipeOperators[TKey]
	>;
};
