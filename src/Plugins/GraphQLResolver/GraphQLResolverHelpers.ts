import * as ts from 'typescript';
import { ModulePath, capitalize } from '@zeroconf/codegen/Util';
import { createImportDeclarationFromModulePath } from '@zeroconf/codegen/Typescript';
import { GenerateSchemaContext } from '@zeroconf/codegen/GraphQL';

export const generateGraphQLResolveInfoImportStatement = () =>
	ts.createImportDeclaration(
		undefined,
		undefined,
		ts.createImportClause(
			undefined,
			ts.createNamedImports([ts.createImportSpecifier(undefined, ts.createIdentifier('GraphQLResolveInfo'))]),
			false,
		),
		ts.createStringLiteral('graphql'),
	);

/**
 * Generate import statement if the `Root` value type is defined
 * externally. If it is not defined elsewhere, then generate a stub type.
 *
 * @example
 * import { Root } from 'path/to/RootValueType';
 *
 * @example
 * export type Root = undefined;
 */
export const generateRootType = (modulePath?: Maybe<ModulePath>) =>
	modulePath == null
		? ts.createTypeAliasDeclaration(
				undefined,
				undefined, // [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
				ts.createIdentifier('Root'),
				undefined,
				ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
		  )
		: createImportDeclarationFromModulePath(modulePath);

/**
 * Either import context type from external file,
 * or generate a stub type.
 *
 * @example
 * import { Context } from 'path/to/Context';
 *
 * @example
 * export type Context = undefined;
 */
export const generateContextType = (modulePath?: Maybe<ModulePath>) =>
	modulePath == null
		? ts.createTypeAliasDeclaration(
				undefined,
				undefined, // [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
				ts.createIdentifier('Context'),
				undefined,
				ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
		  )
		: createImportDeclarationFromModulePath(modulePath);

const scalars = {
	Boolean: ts.SyntaxKind.BooleanKeyword,
	Float: ts.SyntaxKind.NumberKeyword,
	ID: ts.SyntaxKind.StringKeyword,
	Int: ts.SyntaxKind.NumberKeyword,
	String: ts.SyntaxKind.StringKeyword,
} as const;

/**
 * Generate built-in Scalars map from GraphQL types to
 * the corresponding Javascript/Typescript types.
 *
 * @example
 * // Built-in GraphQL scalar to JS type map.
 * export interface Scalars {
 *     Boolean: boolean;
 *     Float: number;
 *     ID: string;
 *     Int: number;
 *     String: string;
 * }
 */
export const generateScalarsMapInterface = () =>
	ts.createInterfaceDeclaration(
		undefined,
		undefined, // [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('Scalars'),
		undefined,
		undefined,
		Object.entries(scalars).map(([key, val]) =>
			ts.createPropertySignature(
				undefined,
				ts.createIdentifier(key),
				undefined,
				ts.createKeywordTypeNode(val),
				undefined,
			),
		),
	);

/**
 * Generate utility wrapper type for resolver functions.
 *
 * @example
 * type ResolverResult<T> = T | Promise<T>;
 */
export const generateResolverResultUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('ResolverResult'),
		[ts.createTypeParameterDeclaration(ts.createIdentifier('T'), undefined, undefined)],
		ts.createUnionTypeNode([
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			ts.createTypeReferenceNode(ts.createIdentifier('Promise'), [
				ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			]),
		]),
	);

type Maybe<T> = T | null;

/**
 * Generate Maybe<T> utility type.
 *
 * @example
 * type Maybe<T> = T | null;
 */
export const generateMaybeUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined, // [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('Maybe'),
		[ts.createTypeParameterDeclaration(ts.createIdentifier('T'), undefined, undefined)],
		ts.createUnionTypeNode([ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined), ts.createNull()]),
	);

/**
 * Generate utility type for a single resolver function,
 * where unnecessary arguments are not represented.
 *
 * * If `Context` is `undefined`, it is omitted from the resolver signature.
 * * If `Parent` is `undefined`, it is omitted from the resolver signature.
 * * If `Args` is `undefined`, it is omitted from the resolver signature.
 *
 * @example
 * withoutParentAndArgs: (context, info) => res
 *
 * @example
 * withoutContext: (parent, args, info) => res
 *
 * @example
 * withoutParent: (context, args, info) => res
 *
 * @example
 * withoutArgs: (context, parent, info) => res
 */
export const generateResolversFnUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined, // [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('ResolverFn'),
		[
			ts.createTypeParameterDeclaration(ts.createIdentifier('TResult'), undefined, undefined),
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('TParent'),
				undefined,
				ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			),
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('TContext'),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('Context'), undefined),
			),
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('TArgs'),
				undefined,
				ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			),
		],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('TContext'), undefined),
			ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			ts.createConditionalTypeNode(
				ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
				ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
				ts.createConditionalTypeNode(
					ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
					ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('args'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
				),
				ts.createConditionalTypeNode(
					ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
					ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('parent'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('parent'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('args'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
				),
			),
			ts.createConditionalTypeNode(
				ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
				ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
				ts.createConditionalTypeNode(
					ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
					ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('context'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TContext'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('context'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TContext'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('args'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
				),
				ts.createConditionalTypeNode(
					ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
					ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('context'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TContext'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('parent'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
					ts.createFunctionTypeNode(
						undefined,
						[
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('context'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TContext'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('parent'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('args'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
								undefined,
							),
							ts.createParameter(
								undefined,
								undefined,
								undefined,
								ts.createIdentifier('info'),
								undefined,
								ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
								undefined,
							),
						],
						ts.createTypeReferenceNode(ts.createIdentifier('ResolverResult'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
						]),
					),
				),
			),
		),
	);

/**
 * Generate utility type for extracting a value from a promise type.
 * If the type is not a promise, the passed in type is just retuned.
 *
 * @example
 * type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
 *
 * @example
 * type ProfileResult = UnwrapPromise<Promise<Profile>>
 *
 * @example
 * type ProfileResult = UnwrapPromise<Profile>
 */
export const generateUnwrapPromiseUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('UnwrapPromise'),
		[ts.createTypeParameterDeclaration(ts.createIdentifier('T'), undefined, undefined)],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			ts.createTypeReferenceNode(ts.createIdentifier('Promise'), [
				ts.createInferTypeNode(
					ts.createTypeParameterDeclaration(ts.createIdentifier('R'), undefined, undefined),
				),
			]),
			ts.createTypeReferenceNode(ts.createIdentifier('R'), undefined),
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
		),
	);

/**
 * Generate utility type for extracting unwrapped resolver function return type.
 *
 * @example
 * type ResolverReturnType<T> =
 *     T extends (...args: any[]) => infer R
 *         ? UnwrapPromise<R>
 *         : UnwrapPromise<T>
 */
export const generateResolverReturnTypeUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('ResolverReturnType'),
		[ts.createTypeParameterDeclaration(ts.createIdentifier('T'), undefined, undefined)],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			ts.createFunctionTypeNode(
				undefined,
				[
					ts.createParameter(
						undefined,
						undefined,
						ts.createToken(ts.SyntaxKind.DotDotDotToken),
						ts.createIdentifier('args'),
						undefined,
						ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
						undefined,
					),
				],
				ts.createInferTypeNode(
					ts.createTypeParameterDeclaration(ts.createIdentifier('R'), undefined, undefined),
				),
			),
			ts.createTypeReferenceNode(ts.createIdentifier('UnwrapPromise'), [
				ts.createTypeReferenceNode(ts.createIdentifier('R'), undefined),
			]),
			ts.createTypeReferenceNode(ts.createIdentifier('UnwrapPromise'), [
				ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			]),
		),
	);

/**
 * Generate response type map, from GraphQL object resolver output type,
 * to the actual GraphQL response type.
 */
export const generateResponseTypeMapInterface = (objectTypes: string[]) =>
	ts.createInterfaceDeclaration(
		undefined,
		undefined, // [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('ResponseTypeMap'),
		undefined,
		undefined,
		objectTypes.map((type) =>
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier(type),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier(`${type}Response`), undefined),
				undefined,
			),
		),
	);

/**
 * Generate utility type, for preserving nullable value,
 * from an extracted result type. Wrap `T` in `Maybe` if `U` is nullable.
 *
 * @example
 * type PreserveMaybe<T, U> = U extends null ? Maybe<T> : T;
 */
export const generatePreserveMaybeUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('PreserveMaybe'),
		[
			ts.createTypeParameterDeclaration(ts.createIdentifier('T'), undefined, undefined),
			ts.createTypeParameterDeclaration(ts.createIdentifier('U'), undefined, undefined),
		],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('U'), undefined),
			ts.createNull(),
			ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
				ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			]),
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
		),
	);

/**
 * Generate utility type for extracting GraphQL response type,
 * from resolver output type name.
 *
 * @example
 * type ExtractResponseTypeLookup<T extends string>
 *    = T extends keyof ResponseTypeMap
 *        ? ResponseTypeMap[T]
 *        : never
 *    ;
 *
 * @example
 * export interface ResponseTypeMap {
 *     Viewer: ViewerResponse;
 * }
 * type ViewerResponse = ExtractResponseTypeLookup<'Viewer'>;
 */
export const generateExtractResponseTypeLookupUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('ExtractResponseTypeLookup'),
		[
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('T'),
				ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				undefined,
			),
		],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			ts.createTypeOperatorNode(ts.createTypeReferenceNode(ts.createIdentifier('ResponseTypeMap'), undefined)),
			ts.createIndexedAccessTypeNode(
				ts.createTypeReferenceNode(ts.createIdentifier('ResponseTypeMap'), undefined),
				ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			),
			ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
		),
	);

/**
 * Generate utility type for extracting response type
 * from resolver output object type.
 *
 * @example
 * type ExtractResponseType<T>
 *     = T extends { readonly ' $__typename': string }
 *         ? PreserveMaybe<ExtractResponseTypeLookup<NonNullable<Required<T>[' $__typename']>>, T>
 *         : T
 *     ;
 *
 * @example
 * type ViewerResponse = ExtractResponseType<Viewer>
 */
export const generateExtractResponseTypeUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('ExtractResponseType'),
		[ts.createTypeParameterDeclaration(ts.createIdentifier('T'), undefined, undefined)],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			ts.createTypeLiteralNode([
				ts.createPropertySignature(
					[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
					ts.createStringLiteral(' $__typename'),
					undefined,
					ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
					undefined,
				),
			]),
			ts.createTypeReferenceNode(ts.createIdentifier('PreserveMaybe'), [
				ts.createTypeReferenceNode(ts.createIdentifier('ExtractResponseTypeLookup'), [
					ts.createTypeReferenceNode(ts.createIdentifier('NonNullable'), [
						ts.createIndexedAccessTypeNode(
							ts.createTypeReferenceNode(ts.createIdentifier('Required'), [
								ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
							]),
							ts.createLiteralTypeNode(ts.createStringLiteral(' $__typename')),
						),
					]),
				]),
				ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			]),
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
		),
	);

/**
 * Generate utility type for resolving response types from output object / list of object types.
 *
 * @example
 * type ResponseTypeLookup<T> =
 *     T extends ReadonlyArray<infer E>
 *         ? PreserveMaybe<readonly ExtractResponseType<E>[], T>
 *         : ExtractResponseType<T>
 *     ;
 *
 * @example
 * // Maybe<ViewerResponse[]>
 * type MaybeViewerResponseArray = ResponseTypeLookup<Maybe<Viewer[]>>;
 * // Maybe<ViewerResponse>[]
 * type MaybeViewerResponseArray = ResponseTypeLookup<Maybe<Viewer>[]>;
 */
export const generateResponseTypeLookupUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('ResponseTypeLookup'),
		[ts.createTypeParameterDeclaration(ts.createIdentifier('T'), undefined, undefined)],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			ts.createTypeReferenceNode(ts.createIdentifier('ReadonlyArray'), [
				ts.createInferTypeNode(
					ts.createTypeParameterDeclaration(ts.createIdentifier('E'), undefined, undefined),
				),
			]),
			ts.createTypeReferenceNode(ts.createIdentifier('PreserveMaybe'), [
				ts.createTypeOperatorNode(
					ts.SyntaxKind.ReadonlyKeyword,
					ts.createArrayTypeNode(
						ts.createTypeReferenceNode(ts.createIdentifier('ExtractResponseType'), [
							ts.createTypeReferenceNode(ts.createIdentifier('E'), undefined),
						]),
					),
				),
				ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			]),
			ts.createTypeReferenceNode(ts.createIdentifier('ExtractResponseType'), [
				ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
			]),
		),
	);

/**
 * Generate utility type for creating a response type
 * from resolver output type and its corresponding resolver map type.
 *
 * @example
 * type ResponseType<T extends { readonly ' $__typename': string }, TResolvers extends {} = {}> =
 *     & { readonly [P in Exclude<keyof T, ' $__typename'>]: ResponseTypeLookup<T[P]> }
 *     & { readonly __typename: NonNullable<T[' $__typename']> }
 *     & { readonly [P in keyof TResolvers]: ResponseTypeLookup<ResolverReturnType<TResolvers[P]>> }
 *     ;
 *
 * @example
 * type ViewerResponse = ResponseType<Viewer, ViewerResolvers>
 */
export const generateResponseTypeUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.createIdentifier('ResponseType'),
		[
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('T'),
				ts.createTypeLiteralNode([
					ts.createPropertySignature(
						[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
						ts.createStringLiteral(' $__typename'),
						undefined,
						ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
						undefined,
					),
				]),
				undefined,
			),
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('TResolvers'),
				ts.createTypeLiteralNode([]),
				ts.createTypeLiteralNode([]),
			),
		],
		ts.createIntersectionTypeNode([
			ts.createMappedTypeNode(
				ts.createToken(ts.SyntaxKind.ReadonlyKeyword),
				ts.createTypeParameterDeclaration(
					ts.createIdentifier('P'),
					ts.createTypeReferenceNode(ts.createIdentifier('Exclude'), [
						ts.createTypeOperatorNode(ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined)),
						ts.createLiteralTypeNode(ts.createStringLiteral(' $__typename')),
					]),
					undefined,
				),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('ResponseTypeLookup'), [
					ts.createIndexedAccessTypeNode(
						ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
						ts.createTypeReferenceNode(ts.createIdentifier('P'), undefined),
					),
				]),
			),
			ts.createTypeLiteralNode([
				ts.createPropertySignature(
					[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
					ts.createIdentifier('__typename'),
					undefined,
					ts.createTypeReferenceNode(ts.createIdentifier('NonNullable'), [
						ts.createIndexedAccessTypeNode(
							ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
							ts.createLiteralTypeNode(ts.createStringLiteral(' $__typename')),
						),
					]),
					undefined,
				),
			]),
			ts.createMappedTypeNode(
				ts.createToken(ts.SyntaxKind.ReadonlyKeyword),
				ts.createTypeParameterDeclaration(
					ts.createIdentifier('P'),
					ts.createTypeOperatorNode(ts.createTypeReferenceNode(ts.createIdentifier('TResolvers'), undefined)),
					undefined,
				),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('ResponseTypeLookup'), [
					ts.createTypeReferenceNode(ts.createIdentifier('ResolverReturnType'), [
						ts.createIndexedAccessTypeNode(
							ts.createTypeReferenceNode(ts.createIdentifier('TResolvers'), undefined),
							ts.createTypeReferenceNode(ts.createIdentifier('P'), undefined),
						),
					]),
				]),
			),
		]),
	);

export const relayTypes = ['Connection', 'Edge', 'Node', 'PageInfo'] as readonly string[];

/**
 * Generate Relay `PageInfo` type interface.
 *
 * @example
 * export interface PageInfo {
 *     readonly endCursor: Maybe<string>;
 *     readonly hasNextPage: boolean;
 *     readonly hasPreviousPage: boolean;
 *     readonly startCursor: Maybe<string>;
 * }
 */
export const generateRelayPageInfoInterface = () =>
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('PageInfo'),
		undefined,
		undefined,
		[
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('endCursor'),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
					ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				]),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('hasNextPage'),
				undefined,
				ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('hasPreviousPage'),
				undefined,
				ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('startCursor'),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
					ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				]),
				undefined,
			),
		],
	);

/**
 * Generate Relay `Node` interface.
 *
 * @example
 * export interface Node {
 *     readonly id: Scalars['ID'];
 * }
 */
export const generateRelayNodeInterface = () =>
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('Node'),
		undefined,
		undefined,
		[
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('id'),
				undefined,
				ts.createIndexedAccessTypeNode(
					ts.createTypeReferenceNode(ts.createIdentifier('Scalars'), undefined),
					ts.createLiteralTypeNode(ts.createStringLiteral('ID')),
				),
				undefined,
			),
		],
	);

/**
 * Generate Relay `Edge` interface.
 *
 * @example
 * export interface Edge<TNode extends Node> {
 *     readonly cursor: string;
 *     readonly node: Maybe<TNode>;
 * }
 */
export const generateRelayEdgeInterface = () =>
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('Edge'),
		[
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('TNode'),
				ts.createTypeReferenceNode(ts.createIdentifier('Node'), undefined),
				undefined,
			),
		],
		undefined,
		[
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('cursor'),
				undefined,
				ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('node'),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
					ts.createTypeReferenceNode(ts.createIdentifier('TNode'), undefined),
				]),
				undefined,
			),
		],
	);

/**
 * Generate Relay connection direction utility type.
 *
 * @example
 * export type ConnectionDirection =
 *     | 'backward'
 *     | 'forward'
 *     | 'both'
 *     ;
 */
export const generateRelayConnectionDirectionUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('ConnectionDirection'),
		undefined,
		ts.createUnionTypeNode([
			ts.createLiteralTypeNode(ts.createStringLiteral('backward')),
			ts.createLiteralTypeNode(ts.createStringLiteral('forward')),
			ts.createLiteralTypeNode(ts.createStringLiteral('both')),
		]),
	);

/**
 * Generate Relay forward connection type.
 *
 * @example
 * export interface ForwardConnectionArgs {
 *     readonly after?: Maybe<Scalars['String']>;
 *     readonly first?: Maybe<Scalars['Int']>;
 * }
 */
export const generateRelayForwardConnectionArgsType = () =>
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('ForwardConnectionArgs'),
		undefined,
		undefined,
		[
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('after'),
				ts.createToken(ts.SyntaxKind.QuestionToken),
				ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
					ts.createIndexedAccessTypeNode(
						ts.createTypeReferenceNode(ts.createIdentifier('Scalars'), undefined),
						ts.createLiteralTypeNode(ts.createStringLiteral('String')),
					),
				]),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('first'),
				ts.createToken(ts.SyntaxKind.QuestionToken),
				ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
					ts.createIndexedAccessTypeNode(
						ts.createTypeReferenceNode(ts.createIdentifier('Scalars'), undefined),
						ts.createLiteralTypeNode(ts.createStringLiteral('Int')),
					),
				]),
				undefined,
			),
		],
	);

/**
 * Generate Relay backward connection type.
 *
 * @example
 * export interface BackwardConnectionArgs {
 *     readonly before?: Maybe<Scalars['String']>;
 *     readonly last?: Maybe<Scalars['Int']>;
 * }
 */
export const generateRelayBackwardConnectionArgsType = () =>
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('BackwardConnectionArgs'),
		undefined,
		undefined,
		[
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('before'),
				ts.createToken(ts.SyntaxKind.QuestionToken),
				ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
					ts.createIndexedAccessTypeNode(
						ts.createTypeReferenceNode(ts.createIdentifier('Scalars'), undefined),
						ts.createLiteralTypeNode(ts.createStringLiteral('String')),
					),
				]),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('last'),
				ts.createToken(ts.SyntaxKind.QuestionToken),
				ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [
					ts.createIndexedAccessTypeNode(
						ts.createTypeReferenceNode(ts.createIdentifier('Scalars'), undefined),
						ts.createLiteralTypeNode(ts.createStringLiteral('Int')),
					),
				]),
				undefined,
			),
		],
	);

/**
 * Generate Relay connection args direction map/lookup interface.
 *
 * @example
 * export interface ConnectionArgsMap {
 *     readonly backward: BackwardConnectionArgs;
 *     readonly both: BackwardConnectionArgs & ForwardConnectionArgs;
 *     readonly forward: ForwardConnectionArgs;
 * }
 */
export const generateRelayConnectionArgsMapInterface = () =>
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('ConnectionArgsMap'),
		undefined,
		undefined,
		[
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('backward'),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('BackwardConnectionArgs'), undefined),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('both'),
				undefined,
				ts.createIntersectionTypeNode([
					ts.createTypeReferenceNode(ts.createIdentifier('BackwardConnectionArgs'), undefined),
					ts.createTypeReferenceNode(ts.createIdentifier('ForwardConnectionArgs'), undefined),
				]),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('forward'),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('ForwardConnectionArgs'), undefined),
				undefined,
			),
		],
	);

/**
 * Generate Relay connection args utility type.
 *
 * @example
 * export type ConnectionArgs<TArgs, TDirection extends ConnectionDirection = 'forward'> =
 *     TArgs extends undefined
 *         ? ConnectionArgsMap[TDirection]
 *         : TArgs & ConnectionArgsMap[TDirection];
 */
export const generateRelayConnectionArgsUtilityType = () =>
	ts.createTypeAliasDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('ConnectionArgs'),
		[
			ts.createTypeParameterDeclaration(ts.createIdentifier('TArgs'), undefined, undefined),
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('TDirection'),
				ts.createTypeReferenceNode(ts.createIdentifier('ConnectionDirection'), undefined),
				ts.createLiteralTypeNode(ts.createStringLiteral('forward')),
			),
		],
		ts.createConditionalTypeNode(
			ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
			ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			ts.createIndexedAccessTypeNode(
				ts.createTypeReferenceNode(ts.createIdentifier('ConnectionArgsMap'), undefined),
				ts.createTypeReferenceNode(ts.createIdentifier('TDirection'), undefined),
			),
			ts.createIntersectionTypeNode([
				ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
				ts.createIndexedAccessTypeNode(
					ts.createTypeReferenceNode(ts.createIdentifier('ConnectionArgsMap'), undefined),
					ts.createTypeReferenceNode(ts.createIdentifier('TDirection'), undefined),
				),
			]),
		),
	);

/**
 * Generate Relay connection interface.
 *
 * @example
 * export interface Connection<TNode extends Node> {
 *     readonly edges: readonly Edge<TNode>[];
 *     readonly pageInfo: PageInfo;
 * }
 */
export const generateRelayConnectionInterface = () =>
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier('Connection'),
		[
			ts.createTypeParameterDeclaration(
				ts.createIdentifier('TNode'),
				ts.createTypeReferenceNode(ts.createIdentifier('Node'), undefined),
				undefined,
			),
		],
		undefined,
		[
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('edges'),
				undefined,
				ts.createTypeOperatorNode(
					ts.SyntaxKind.ReadonlyKeyword,
					ts.createArrayTypeNode(
						ts.createTypeReferenceNode(ts.createIdentifier('Edge'), [
							ts.createTypeReferenceNode(ts.createIdentifier('TNode'), undefined),
						]),
					),
				),
				undefined,
			),
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier('pageInfo'),
				undefined,
				ts.createTypeReferenceNode(ts.createIdentifier('PageInfo'), undefined),
				undefined,
			),
		],
	);

/**
 * Wrapping type in the Maybe<T> utility type.
 *
 * @example
 * type Viewer {
 *     profile: Maybe<Profile>;
 * }
 */
const createMaybeType = (node: ts.TypeNode, isOptional: boolean) =>
	isOptional ? ts.createTypeReferenceNode(ts.createIdentifier('Maybe'), [node]) : node;

/**
 * Create a scalar type node.
 *
 * @example
 * interface Profile implements Node {
 *     id: Scalars['ID'];
 *     name: Scalars['String'];
 *     age: Maybe<Scalars['Int']>;
 * }
 */
const createScalarType = (typeName: keyof typeof scalars) =>
	ts.createIndexedAccessTypeNode(
		ts.createTypeReferenceNode(ts.createIdentifier('Scalars'), undefined),
		ts.createLiteralTypeNode(ts.createStringLiteral(typeName)),
	);

/**
 * Create non-scalar non-list type node.
 *
 * @example
 * interface Viewer {
 *     profile: Profile;
 * }
 */
const createNamedType = (typeName: string, typeArgs?: readonly string[]) =>
	ts.createTypeReferenceNode(
		ts.createIdentifier(typeName),
		typeArgs == null || typeArgs.length === 0
			? undefined
			: typeArgs.map((typeArg) => ts.createTypeReferenceNode(ts.createIdentifier(typeArg), undefined)),
	);

/**
 * Type guard for deciding if a type is a scalar.
 *
 * @example
 * isScalarType(typeName)
 *     ? createScalarType(typeName)
 *     : createNamedType(typeName)
 */
const isScalarType = (typeName: string): typeName is keyof typeof scalars =>
	Object.prototype.hasOwnProperty.call(scalars, typeName);

/**
 * Create a list type node.
 *
 * @example
 * readonly T[]
 */
const createListType = (node: ts.TypeNode) =>
	ts.createTypeOperatorNode(ts.SyntaxKind.ReadonlyKeyword, ts.createArrayTypeNode(node));

export type FieldType = ListFieldType | NamedFieldType;
type ListFieldType = { listOf: FieldType; nullable: boolean };
type NamedFieldType = { listOf?: undefined; fieldType: string; nullable: boolean; typeArgs?: string[] };

export type Field = FieldType & { fieldName: string };

/**
 * Resolve Optional/List/Scalar/NamedType, and create corresponding typescript resolution.
 *
 * @example
 * createTypeFromField({ fieldName: 'id', fieldType: 'ID', nullable: false })
 * interface Viewer {
 *     // Output
 *     id: Scalars['ID']
 * }
 *
 * @example
 * createTypeFromField({ fieldName: 'address', fieldType: 'String', nullable: true })
 * interface Profile {
 *     // Output
 *     address: Maybe<Scalars['String']>;
 * }
 *
 * @example
 * createTypeFromField({ fieldName: 'profile', fieldType: 'Profile', nullable: true })
 * interface Viewer {
 *     // Output
 *     profile: Maybe<Profile>;
 * }
 *
 * @example
 * createTypeFromField({ fieldName: 'friends', listOf: { fieldType: 'Profile', nullable: true }, nullable: true })
 * interface Profile {
 *     // Output
 *     friends: Maybe<readonly Maybe<Profile>[]>;
 * }
 */
const createTypeFromField = (field: Field | FieldType): ts.TypeNode =>
	field.listOf == null
		? createMaybeType(
				isScalarType(field.fieldType)
					? createScalarType(field.fieldType)
					: createNamedType(field.fieldType, field.typeArgs),
				field.nullable,
		  )
		: createMaybeType(createListType(createTypeFromField(field.listOf)), field.nullable);

/**
 * Generate GraphQL object types.
 *
 * @example
 * ```graphql
 * # GraphQL input type.
 * type Viewer implements Node {
 *     id: ID!
 *     name: String
 * }
 * ```
 * ```typescript
 * // TS definition output.
 * export interface Viewer implements Node {
 *     readonly " $__typename": "Viewer";
 *     readonly id: Scalars['ID'];
 *     readonly name: Maybe<Scalars['String']>;
 * }
 * ````
 */
export const generateObjectType = (
	context: GenerateSchemaContext,
	typeName: string,
	fields: Field[],
	interfaceMap: { [typeName: string]: undefined | { typeName: string; typeArgs?: string[] }[] },
) => {
	const interfaces = interfaceMap[typeName];

	return ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier(typeName),
		undefined,
		interfaces == null || interfaces.length === 0
			? undefined
			: [
					ts.createHeritageClause(
						ts.SyntaxKind.ExtendsKeyword,
						interfaces.map((iface) =>
							ts.createExpressionWithTypeArguments(
								iface.typeArgs == null || iface.typeArgs.length === 0
									? undefined
									: iface.typeArgs.map((typeArg) =>
											ts.createTypeReferenceNode(ts.createIdentifier(typeArg), undefined),
									  ),
								ts.createIdentifier(iface.typeName),
							),
						),
					),
			  ],
		[
			...context.typeInfo.isInterfaceType(typeName) ? [] : [
				ts.createPropertySignature(
					[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
					ts.createStringLiteral(' $__typename'),
					undefined,
					ts.createLiteralTypeNode(ts.createStringLiteral(typeName)),
					undefined,
				)
			],
			...fields.map((field) =>
				ts.createPropertySignature(
					[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
					ts.createIdentifier(field.fieldName),
					undefined,
					createTypeFromField(field),
					undefined,
				),
			),
		],
	);
};

export const generateObjectTypeFieldResolvers = (
	typeName: string,
	fields: Field[],
) => [
	...fields.reduce((carry, field) => [
		...carry,
		ts.createTypeAliasDeclaration(
			undefined,
			undefined,
			ts.createIdentifier(capitalize(typeName, field.fieldName, 'Args')),
			undefined,
			ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
		),
		ts.createTypeAliasDeclaration(
			undefined,
			undefined,
			ts.createIdentifier(capitalize(typeName, field.fieldName, 'Resolver')),
			undefined,
			ts.createTypeReferenceNode(
				ts.createIdentifier('ResolverFn'),
				[
					createTypeFromField(field),
					ts.createTypeReferenceNode(
						ts.createIdentifier(typeName),
						undefined,
					),
					ts.createTypeReferenceNode(
						ts.createIdentifier('Context'),
						undefined,
					),
					ts.createTypeReferenceNode(
						ts.createIdentifier(capitalize(typeName, field.fieldName, 'Args')),
						undefined,
					),
				],
			),
		),
	],
	[] as ts.TypeAliasDeclaration[]),
	ts.createInterfaceDeclaration(
		undefined,
		[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.createIdentifier(capitalize(typeName, 'Resolvers')),
		undefined,
		undefined,
		fields.map((field) =>
			ts.createPropertySignature(
				[ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.createIdentifier(field.fieldName),
				undefined,
				ts.createTypeReferenceNode(
					ts.createIdentifier(capitalize(typeName, field.fieldName, 'Resolver')),
					undefined,
				),
				undefined,
			),
		),
	),
];
