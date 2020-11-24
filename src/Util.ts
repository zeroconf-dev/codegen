import { isAbsolute, join, dirname, basename, extname } from 'path';

export interface ModulePath {
	defaultImport: boolean;
	exportName?: Maybe<string>;
	importName: string;
	importPath: string;
}

export const filterNonNull = <T>(arr: Maybe<T>[]): T[] => arr.filter((e) => e != null) as T[];

export function getModulePath(modulePathStr: string): ModulePath {
	const [importPath, importNameRaw] = modulePathStr.split('#');
	const first = importNameRaw[0];
	const last = importNameRaw[importNameRaw.length - 1];

	const defaultImportMarkers = first === '[' && last === ']';
	const importName = defaultImportMarkers ? importNameRaw.substr(1, importNameRaw.length - 2) : importNameRaw;

	return {
		defaultImport: importNameRaw === 'default' || importNameRaw === '' || defaultImportMarkers,
		importName: importName ?? 'default',
		importPath: importPath,
	};
}

export const WILDCARD = '*';
export const DOUBLE_WILDCARD = '**';

export function isWildcardPath(path: string): boolean {
	return path.includes(WILDCARD);
}

export function isRecursiveWildcardPath(path: string): boolean {
	return path.includes(DOUBLE_WILDCARD);
}

export function compileOutputPath(
	inputFile: string,
	inputPattern: string,
	outputPattern: string,
	cwd = process.cwd(),
): string {
	if (isRecursiveWildcardPath(outputPattern)) {
		throw new TypeError(`Illegal output pattern, recursive wildcard is not supported: '${outputPattern}'`);
	}

	if (isWildcardPath(outputPattern)) {
		const count = (outputPattern.match(new RegExp(`\\${WILDCARD}`, 'g')) ?? []).length;
		if (count > 1) {
			throw new TypeError(`Illegal output pattern, multiple wildcards are not allowed: '${outputPattern}'`);
		}
		const [, secondPath] = outputPattern.split(WILDCARD);
		if (secondPath.includes('/') || secondPath.includes('\\')) {
			throw new TypeError(
				`Illegal output pattern, directory separators are not allowed after wildcards: '${outputPattern}'`,
			);
		}

		if (isWildcardPath(inputPattern)) {
			const absoluteInputPattern = isAbsolute(inputPattern) ? inputPattern : join(cwd, inputPattern);
			const absoluteOutputPattern = isAbsolute(outputPattern) ? outputPattern : join(cwd, outputPattern);

			const firstInputWildcardIdx = absoluteInputPattern.indexOf(WILDCARD);
			const firstInputPart = absoluteInputPattern.substring(0, firstInputWildcardIdx);

			const firstOutputWildcardIdx = absoluteOutputPattern.indexOf(WILDCARD);
			const firstOutputPart = absoluteOutputPattern.substring(0, firstOutputWildcardIdx);

			const outputFile = inputFile.replace(firstInputPart, firstOutputPart);
			if (absoluteOutputPattern.endsWith(WILDCARD)) {
				return outputFile;
			} else {
				const lastOutputWildcardIdx = absoluteOutputPattern.lastIndexOf(WILDCARD) + 1;
				const outputExtension = absoluteOutputPattern.substring(lastOutputWildcardIdx);

				const outputDirectory = dirname(outputFile);
				const outputFileExtension = extname(outputFile);
				const outputFileBasename = basename(outputFile, outputFileExtension);

				return join(outputDirectory, `${outputFileBasename}${outputExtension}`);
			}
		} else {
			throw new TypeError(`Output pattern with wildcards are not allowed without an input pattern with at least a single wildcard.
Input pattern: '${inputPattern}'
Output pattern: '${outputPattern}'
`);
		}
	}

	return isAbsolute(outputPattern) ? outputPattern : join(cwd, outputPattern);
}

export const assertNever = (_obj: never, msg: string): never => {
	throw new Error(msg);
};

export const capitalize = (...parts: string[]): string =>
	parts.map((part) => (part.length === 0 ? '' : part.charAt(0).toLocaleUpperCase() + part.substring(1))).join('');

type SingleArgFn<T extends any = any> = (arg: T) => any;
type Fn = (...args: any[]) => any;
type FirstArgType<T extends Fn> = T extends (arg: infer A, ...args: any[]) => any ? A : never;
type ResultType<T extends Fn> = T extends (...args: any[]) => infer R ? R : never;

export function map<T extends SingleArgFn = SingleArgFn<unknown>, R extends ResultType<T> = ResultType<T>>(
	fn: T,
): (iter: Iterable<FirstArgType<T>>) => Iterable<R> {
	return function* <T1 extends Iterable<FirstArgType<T>> = Iterable<FirstArgType<T>>>(iter2: T1): Iterable<R> {
		let res: IteratorResult<FirstArgType<T>>;
		const iter = iter2[Symbol.iterator]();
		while (true) {
			res = iter.next();
			if (res.done) {
				return;
			}
			yield fn(res.value);
		}
	};
}

type Predicate<T extends any = any> = (arg: T) => boolean;

export function filter<T extends Predicate = Predicate<unknown>, R extends FirstArgType<T> = FirstArgType<T>>(
	fn: T,
): (iter: Iterable<FirstArgType<T>>) => Iterable<R> {
	return function* <T1 extends Iterable<FirstArgType<T>> = Iterable<FirstArgType<T>>>(iter2: T1): Iterable<R> {
		let res: IteratorResult<FirstArgType<T>>;
		const iter = iter2[Symbol.iterator]();
		while (true) {
			res = iter.next();
			if (res.done) {
				return;
			}
			if (fn(res.value)) {
				yield res.value;
			}
		}
	};
}

type FlattenIterable<T> = T extends Iterable<Iterable<infer R>> ? R : never;

export function* flatten<T extends Iterable<Iterable<any>>>(iter: T): Iterable<FlattenIterable<T>> {
	let res: IteratorResult<Iterable<FlattenIterable<T>>>;
	const iter2 = iter[Symbol.iterator]();
	while (true) {
		res = iter2.next();
		if (res.done) {
			return;
		}
		for (const value of res.value) {
			yield value;
		}
	}
}

export function flatMap<T extends SingleArgFn = SingleArgFn<unknown>, R extends ResultType<T> = ResultType<T>>(
	fn?: T,
): (iter: Iterable<Iterable<FirstArgType<T>>>) => Iterable<R> {
	return function* <T1 extends Iterable<Iterable<FirstArgType<T>>> = Iterable<Iterable<FirstArgType<T>>>>(
		iter2: T1,
	): Iterable<R> {
		let res: IteratorResult<Iterable<FirstArgType<T>>>;
		const iter = iter2[Symbol.iterator]();
		while (true) {
			res = iter.next();
			if (res.done) {
				return;
			}
			for (const value of res.value) {
				yield fn == null ? value : fn(value);
			}
		}
	};
}

export function just<T, R>(value: R): (iter: Iterable<T>) => Iterable<T | R> {
	return function* (iter2: Iterable<T>): Iterable<T | R> {
		let res: IteratorResult<T>;
		const iter = iter2[Symbol.iterator]();
		while (true) {
			res = iter.next();
			if (res.done) {
				yield value;
				return;
			}
			yield res.value;
		}
	};
}

export const not = <T extends Predicate = Predicate<unknown>>(predicate: T) => <
	T1 extends FirstArgType<T> = FirstArgType<T>
>(
	val: T1,
): boolean => !predicate(val);

export function pipe<TInput, TPipeOperators extends readonly any[]>(
	iterable: Iterable<TInput>,
	...operators: PipeOperators<TInput, TPipeOperators>
): PipeResult<TInput, TPipeOperators> {
	const [firstOperator, ...restOperators] = operators;
	return (firstOperator == null
		? iterable
		: restOperators.reduce((result, operator) => operator(result), firstOperator(iterable))) as PipeResult<
		TInput,
		TPipeOperators
	>;
}

export function isString(str: unknown): str is string {
	return typeof str === 'string';
}

export function isMaybeString(str: unknown): str is Maybe<string> {
	return str == null || isString(str);
}

export function isBoolean(str: unknown): str is boolean {
	return typeof str === 'boolean';
}

export function isMaybeBoolean(str: unknown): str is Maybe<boolean> {
	return str == null || isBoolean(str);
}

export function isNumber(str: unknown): str is number {
	return typeof str === 'number';
}

export function isMaybeNumber(str: unknown): str is Maybe<number> {
	return str == null || isNumber(str);
}

export async function* nodeStreamToStream(str: NodeJS.ReadableStream): Stream<string | Buffer> {
	for await (const value of str) {
		yield value;
	}
}
