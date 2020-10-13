import { isWildcardPath, isRecursiveWildcardPath, compileOutputPath } from '@zeroconf/codegen/Util';

describe('Path', () => {
	test('isWildcardPath returns true when path contains have at least one glob wildcard', () => {
		expect(isWildcardPath('test/*.ts')).toBe(true);
	});

	test('isWildcardPath returns false when none glob wildcard tokens are present', () => {
		expect(isWildcardPath('test/path.ts')).toBe(false);
	});

	test('isRecursiveWildcardPath returns true when path contains at least one double glob wildcard token', () => {
		expect(isRecursiveWildcardPath('test/**/test.ts')).toBe(true);
	});

	test('isRecursiveWildcardPath returns false when path only contains a single glob wildcard token', () => {
		expect(isRecursiveWildcardPath('test/*.ts')).toBe(false);
	});

	test('isRecursiveWildcardPath returns false when path not contains glob wildcard tokens', () => {
		expect(isRecursiveWildcardPath('test/path.ts')).toBe(false);
	});
});

`
input path                      input pattern               output pattern              output path
------------------------------------------------------------------------------------------------------------
/input/file/path.graphql        /input/file/path.graphql    /output/file/path.ts        /output/file/path.ts
/input/file/path.graphql        /input/file/*.graphql       /output/file/path.ts        /output/file/path.ts
/input/file/path.graphql        /input/file/**/*.graphql    /output/file/path.ts        /output/file/path.ts
/input/file/sub/path.graphql    /input/file/**/*.graphql    /output/file/sub/path.ts    /output/file/sub/path.ts
/input/file/path.graphql        /input/file/path.graphql    /output/file/*.ts           /output/file/path.ts
/input/file/path.graphql        /input/file/*.graphql       /output/file/*.ts           /output/file/path.ts
/input/file/sub/path.graphql    /input/file/**/*.graphql    /output/file/*.ts           /output/file/sub/path.ts

*                               *                           /output/**                  throw
*                               *                           /output/*/                  throw
`;

describe('compileOutputPath', () => {
	test('input absolute path -> output absolute path', () => {
		expect(compileOutputPath('/input/file/path.graphql', '/input/file/path.graphql', '/output/file/path.ts')).toBe(
			'/output/file/path.ts',
		);
	});

	test('input wildcard path -> absolute output path', () => {
		expect(compileOutputPath('/input/file/path.graphql', '/input/file/*.graphql', '/output/file/path.ts')).toBe(
			'/output/file/path.ts',
		);
	});

	test('input recursive wildcard path -> absolute output path', () => {
		expect(compileOutputPath('/input/file/path.graphql', '/input/file/**/*.graphql', '/output/file/path.ts')).toBe(
			'/output/file/path.ts',
		);
		expect(
			compileOutputPath('/input/file/sub/path.graphql', '/input/file/**/*.graphql', '/output/file/sub/path.ts'),
		).toBe('/output/file/sub/path.ts');
	});

	test('input any path -> output recursive wildcard path', () => {
		expect(() =>
			compileOutputPath('/input/any/file/path.ext', '/input/any/file/path.ext', '/output/**'),
		).toThrowErrorMatchingInlineSnapshot(
			`"Illegal output pattern, recursive wildcard is not supported: '/output/**'"`,
		);
	});

	test('input any path -> output wildcard path', () => {
		expect(() =>
			compileOutputPath('/input/any/file/path.ext', '/input/any/file/path.ext', '/output/*/'),
		).toThrowErrorMatchingInlineSnapshot(
			`"Illegal output pattern, directory separators are not allowed after wildcards: '/output/*/'"`,
		);
	});

	test('input absolute path -> output wildcard path, match all prefix input, extension bound output.', () => {
		expect(compileOutputPath('/input/file/path.graphql', '/input/**', '/output/*.ts')).toBe('/output/file/path.ts');
	});

	test('input absolute path -> output wildcard path, extension bound input, match prefix output', () => {
		expect(compileOutputPath('/input/file/path.graphql', '/input/**/*.graphql', '/output/*')).toBe(
			'/output/file/path.graphql',
		);
	});

	test('input wildcard path -> output wildcard path', () => {
		expect(compileOutputPath('/input/file/path.graphql', '/input/file/*.graphql', '/output/file/*.ts')).toBe(
			'/output/file/path.ts',
		);
	});

	test('input recursive wildcard path -> output wildcard path', () => {
		expect(compileOutputPath('/input/file/sub/path.graphql', '/input/file/**/*.graphql', '/output/file/*.ts')).toBe(
			'/output/file/sub/path.ts',
		);
	});
});
