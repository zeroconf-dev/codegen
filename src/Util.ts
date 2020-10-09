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

export function map<T, R>(fn: (val: T) => R): (iter: Iterable<T>) => Iterable<R> {
	return function* (iter2: Iterable<T>): Iterable<R> {
		let res: IteratorResult<T>;
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

export function filter<T>(
	fn: (val: T) => boolean,
): (iter: Iterable<T>) => Iterable<T> {
	return function* (iter2: Iterable<T>): Iterable<T> {
		let res: IteratorResult<T>;
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

export function flatMap<T, R = T>(
	fn?: (val: T) => R,
): (iter: Iterable<Iterable<T>>) => Iterable<R> {
	return function* (iter2: Iterable<Iterable<T>>): Iterable<R> {
		let res: IteratorResult<Iterable<T>>;
		const iter = iter2[Symbol.iterator]();
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

export const not = <T>(predicate: (val: T) => boolean) => (val: T): boolean => !predicate(val);

export function pipe<T1, T2>(
	iter1: Iterable<T1>,
	iter2: (i: Iterable<T1>) => Iterable<T2>,
): Iterable<T2>;
export function pipe<T1, T2, T3>(
	iter: Iterable<T1>,
	iter2: (i: Iterable<T1>) => Iterable<T2>,
	iter3: (i: Iterable<T2>) => Iterable<T3>,
): Iterable<T3>;
export function pipe<T1, T2, T3, T4>(
	iter: Iterable<T1>,
	iter2: (i: Iterable<T1>) => Iterable<T2>,
	iter3: (i: Iterable<T2>) => Iterable<T3>,
	iter4: (i: Iterable<T3>) => Iterable<T4>,
): Iterable<T4>;
export function pipe<T1, T2, T3, T4, T5>(
	iter: Iterable<T1>,
	iter2: (i: Iterable<T1>) => Iterable<T2>,
	iter3: (i: Iterable<T2>) => Iterable<T3>,
	iter4: (i: Iterable<T3>) => Iterable<T4>,
	iter5: (i: Iterable<T4>) => Iterable<T5>,
): Iterable<T5>;
export function pipe<T1, T2, T3, T4, T5, T6>(
	iter: Iterable<T1>,
	iter2: (i: Iterable<T1>) => Iterable<T2>,
	iter3: (i: Iterable<T2>) => Iterable<T3>,
	iter4: (i: Iterable<T3>) => Iterable<T4>,
	iter5: (i: Iterable<T4>) => Iterable<T5>,
	iter6: (i: Iterable<T5>) => Iterable<T6>,
): Iterable<T6>;
export function pipe<T1, T2, T3, T4, T5, T6, T7>(
	iter: Iterable<T1>,
	iter2: (i: Iterable<T1>) => Iterable<T2>,
	iter3: (i: Iterable<T2>) => Iterable<T3>,
	iter4: (i: Iterable<T3>) => Iterable<T4>,
	iter5: (i: Iterable<T4>) => Iterable<T5>,
	iter6: (i: Iterable<T5>) => Iterable<T6>,
	iter7: (i: Iterable<T6>) => Iterable<T7>,
): Iterable<T7>;
export function* pipe<T1>(
	iter: Iterable<T1>,
	...iters: ((i: Iterable<any>) => Iterable<any>)[]
): Iterable<any> {
	yield* iters.reduce((r, i) => i(r), iter as Iterable<T1>);
}
