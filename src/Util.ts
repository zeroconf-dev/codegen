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

export const assertNever = (_obj: never, msg: string): never => {
	throw new Error(msg);
};

export const capitalize = (...parts: string[]): string =>
	parts.map((part) => (part.length === 0 ? '' : part.charAt(0).toLocaleUpperCase() + part.substring(1))).join('');

export function map<T, R>(fn: (val: T) => R): (iter: Iterator<T, void, undefined>) => Generator<R, void, undefined> {
	return function* (iter: Iterator<T, void, undefined>): Generator<R, void, undefined> {
		let res: IteratorResult<T>;
		while (true) {
			res = iter.next();
			if (res.done) {
				return;
			}
			yield fn(res.value);
		}
	};
}

export function filter<T>(
	fn: (val: T) => boolean,
): (iter: Iterator<T, void, undefined>) => Generator<T, void, undefined> {
	return function* (iter: Iterator<T, void, undefined>): Generator<T, void, undefined> {
		let res: IteratorResult<T>;
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

export function flatMap<T, R = T>(
	fn?: (val: T) => R,
): (iter: Iterator<Iterable<T>, void, undefined>) => Generator<R, void, undefined> {
	return function* (iter: Iterator<Iterable<T>, void, undefined>): Generator<R, void, undefined> {
		let res: IteratorResult<Iterable<T>>;
		while (true) {
			res = iter.next();
			if (res.done) {
				return;
			}
			for (const value of res.value) {
				yield (fn == null ? value : fn(value)) as R;
			}
		}
	};
}

export function just<T, R>(value: R): (iter: Iterator<T, void, undefined>) => Generator<T | R, void, undefined> {
	return function* (iter: Iterator<T, void, undefined>): Generator<T | R, void, undefined> {
		let res: IteratorResult<T>;
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

export const not = <T>(predicate: (val: T) => boolean) => (val: T) => !predicate(val);

export function pipe<T1, T2>(
	iter1: Iterator<T1, void, undefined>,
	iter2: (i: Iterator<T1, void, undefined>) => Generator<T2, void, undefined>,
): Generator<T2, void, undefined>;
export function pipe<T1, T2, T3>(
	iter: Iterator<T1, void, undefined>,
	iter2: (i: Iterator<T1, void, undefined>) => Generator<T2, void, undefined>,
	iter3: (i: Iterator<T2, void, undefined>) => Generator<T3, void, undefined>,
): Generator<T3, void, undefined>;
export function pipe<T1, T2, T3, T4>(
	iter: Iterator<T1, void, undefined>,
	iter2: (i: Iterator<T1, void, undefined>) => Generator<T2, void, undefined>,
	iter3: (i: Iterator<T2, void, undefined>) => Generator<T3, void, undefined>,
	iter4: (i: Iterator<T3, void, undefined>) => Generator<T4, void, undefined>,
): Generator<T4, void, undefined>;
export function pipe<T1, T2, T3, T4, T5>(
	iter: Iterator<T1, void, undefined>,
	iter2: (i: Iterator<T1, void, undefined>) => Generator<T2, void, undefined>,
	iter3: (i: Iterator<T2, void, undefined>) => Generator<T3, void, undefined>,
	iter4: (i: Iterator<T3, void, undefined>) => Generator<T4, void, undefined>,
	iter5: (i: Iterator<T4, void, undefined>) => Generator<T5, void, undefined>,
): Generator<T5, void, undefined>;
export function pipe<T1, T2, T3, T4, T5, T6>(
	iter: Iterator<T1, void, undefined>,
	iter2: (i: Iterator<T1, void, undefined>) => Generator<T2, void, undefined>,
	iter3: (i: Iterator<T2, void, undefined>) => Generator<T3, void, undefined>,
	iter4: (i: Iterator<T3, void, undefined>) => Generator<T4, void, undefined>,
	iter5: (i: Iterator<T4, void, undefined>) => Generator<T5, void, undefined>,
	iter6: (i: Iterator<T5, void, undefined>) => Generator<T6, void, undefined>,
): Generator<T6, void, undefined>;
export function pipe<T1, T2, T3, T4, T5, T6, T7>(
	iter: Iterator<T1, void, undefined>,
	iter2: (i: Iterator<T1, void, undefined>) => Generator<T2, void, undefined>,
	iter3: (i: Iterator<T2, void, undefined>) => Generator<T3, void, undefined>,
	iter4: (i: Iterator<T3, void, undefined>) => Generator<T4, void, undefined>,
	iter5: (i: Iterator<T4, void, undefined>) => Generator<T5, void, undefined>,
	iter6: (i: Iterator<T5, void, undefined>) => Generator<T6, void, undefined>,
	iter7: (i: Iterator<T6, void, undefined>) => Generator<T7, void, undefined>,
): Generator<T7, void, undefined>;
export function* pipe<T1>(
	iter: Iterator<T1, void, undefined>,
	...iters: ((i: Iterator<any, void, undefined>) => Generator<any, void, undefined>)[]
): Generator<any, void, undefined> {
	yield* iters.reduce((r, i) => i(r), iter as Generator<T1, void, undefined>);
}
