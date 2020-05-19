export interface ModulePath {
	defaultImport: boolean;
	exportName?: Maybe<string>;
	importName: string;
	importPath: string;
}

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

export function map<T, R>(fn: (val: T) => R): (iter: Iterator<T, void, void>) => Generator<R, void, void> {
	return function* (iter: Iterator<T, void, void>): Generator<R, void, void> {
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

export function filter<T>(fn: (val: T) => boolean): (iter: Iterator<T, void, void>) => Generator<T, void, void> {
	return function* (iter: Iterator<T, void, void>): Generator<T, void, void> {
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

export function pipe<T1, T2>(
	iter1: Iterator<T1, void, void>,
	iter2: (i: Iterator<T1, void, void>) => Generator<T2, void, void>,
): Generator<T2, void, void>;
export function pipe<T1, T2, T3>(
	iter: Iterator<T1, void, void>,
	iter2: (i: Iterator<T1, void, void>) => Generator<T2, void, void>,
	iter3: (i: Iterator<T2, void, void>) => Generator<T3, void, void>,
): Generator<T3, void, void>;
export function pipe<T1, T2, T3, T4>(
	iter: Iterator<T1, void, void>,
	iter2: (i: Iterator<T1, void, void>) => Generator<T2, void, void>,
	iter3: (i: Iterator<T2, void, void>) => Generator<T3, void, void>,
	iter4: (i: Iterator<T3, void, void>) => Generator<T4, void, void>,
): Generator<T4, void, void>;
export function pipe<T1, T2, T3, T4, T5>(
	iter: Iterator<T1, void, void>,
	iter2: (i: Iterator<T1, void, void>) => Generator<T2, void, void>,
	iter3: (i: Iterator<T2, void, void>) => Generator<T3, void, void>,
	iter4: (i: Iterator<T3, void, void>) => Generator<T4, void, void>,
	iter5: (i: Iterator<T4, void, void>) => Generator<T5, void, void>,
): Generator<T5, void, void>;
export function pipe<T1, T2, T3, T4, T5, T6>(
	iter: Iterator<T1, void, void>,
	iter2: (i: Iterator<T1, void, void>) => Generator<T2, void, void>,
	iter3: (i: Iterator<T2, void, void>) => Generator<T3, void, void>,
	iter4: (i: Iterator<T3, void, void>) => Generator<T4, void, void>,
	iter5: (i: Iterator<T4, void, void>) => Generator<T5, void, void>,
	iter6: (i: Iterator<T5, void, void>) => Generator<T6, void, void>,
): Generator<T6, void, void>;
export function pipe<T1, T2, T3, T4, T5, T6, T7>(
	iter: Iterator<T1, void, void>,
	iter2: (i: Iterator<T1, void, void>) => Generator<T2, void, void>,
	iter3: (i: Iterator<T2, void, void>) => Generator<T3, void, void>,
	iter4: (i: Iterator<T3, void, void>) => Generator<T4, void, void>,
	iter5: (i: Iterator<T4, void, void>) => Generator<T5, void, void>,
	iter6: (i: Iterator<T5, void, void>) => Generator<T6, void, void>,
	iter7: (i: Iterator<T6, void, void>) => Generator<T7, void, void>,
): Generator<T7, void, void>;
export function* pipe<T1>(
	iter: Iterator<T1, void, void>,
	...iters: ((i: Iterator<any, void, void>) => Generator<any, void, void>)[]
): Generator<any, void, void> {
	yield* iters.reduce((r, i) => i(r), iter as Generator<T1, void, void>);
}
