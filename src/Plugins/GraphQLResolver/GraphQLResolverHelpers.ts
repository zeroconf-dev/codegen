import { GenerateSchemaContext } from '@zeroconf/codegen/GraphQL';
import { addNodeCommentBlock, createImportDeclarationFromModulePath } from '@zeroconf/codegen/Typescript';
import { assertNever, capitalize, filter, flatMap, just, map, ModulePath, not, pipe } from '@zeroconf/codegen/Util';
import { FieldDefinitionNode, Kind, ListTypeNode, NamedTypeNode, NonNullTypeNode } from 'graphql';
import * as ts from 'typescript';

export const generateGraphQLResolveInfoImportStatement = () =>
	ts.factory.createImportDeclaration(
		undefined,
		undefined,
		ts.factory.createImportClause(
			true,
			undefined,
			ts.factory.createNamedImports([
				ts.factory.createImportSpecifier(undefined, ts.factory.createIdentifier('GraphQLResolveInfo')),
			]),
		),
		ts.factory.createStringLiteral('graphql'),
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
		? ts.factory.createTypeAliasDeclaration(
				undefined,
				undefined, // [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
				ts.factory.createIdentifier('Root'),
				undefined,
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
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
		? ts.factory.createTypeAliasDeclaration(
				undefined,
				undefined, // [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
				ts.factory.createIdentifier('Context'),
				undefined,
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		undefined, // [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('Scalars'),
		undefined,
		undefined,
		Object.entries(scalars).map(([key, val]) =>
			ts.factory.createPropertySignature(
				undefined,
				ts.factory.createIdentifier(key),
				undefined,
				ts.factory.createKeywordTypeNode(val),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('ResolverResult'),
		[ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('T'))],
		ts.factory.createUnionTypeNode([
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined, // [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('Maybe'),
		[ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('T'))],
		ts.factory.createUnionTypeNode([
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			ts.factory.createLiteralTypeNode(ts.factory.createNull()),
		]),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined, // [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('ResolverFn'),
		[
			ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('TResult')),
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('TParent'),
				undefined,
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			),
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('TContext'),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Context')),
			),
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('TArgs'),
				undefined,
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			),
		],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TContext')),
			ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			ts.factory.createConditionalTypeNode(
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TParent')),
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
				ts.factory.createConditionalTypeNode(
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
					ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('args'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
				),
				ts.factory.createConditionalTypeNode(
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
					ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('parent'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TParent')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('parent'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TParent')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('args'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
				),
			),
			ts.factory.createConditionalTypeNode(
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TParent')),
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
				ts.factory.createConditionalTypeNode(
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
					ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('context'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TContext')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('context'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TContext')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('args'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
				),
				ts.factory.createConditionalTypeNode(
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
					ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('context'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TContext')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('parent'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TParent')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
					ts.factory.createFunctionTypeNode(
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('context'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TContext')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('parent'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TParent')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('args'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
							),
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								undefined,
								ts.factory.createIdentifier('info'),
								undefined,
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('GraphQLResolveInfo')),
							),
						],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverResult'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResult')),
						]),
					),
				),
			),
		),
	);

/**
 * Generate utility type for extracting a value from a promise type.
 * If the type is not a promise, the passed in type is just returned.
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('UnwrapPromise'),
		[ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('T'))],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
				ts.factory.createInferTypeNode(
					ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('R')),
				),
			]),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('R')),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('ResolverReturnType'),
		[ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('T'))],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			ts.factory.createFunctionTypeNode(
				undefined,
				[
					ts.factory.createParameterDeclaration(
						undefined,
						undefined,
						ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
						ts.factory.createIdentifier('args'),
						undefined,
						ts.factory.createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
					),
				],
				ts.factory.createInferTypeNode(
					ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('R')),
				),
			),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('UnwrapPromise'), [
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('R')),
			]),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('UnwrapPromise'), [
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			]),
		),
	);

/**
 * Generate response type map, from GraphQL object resolver output type,
 * to the actual GraphQL response type.
 */
export const generateResponseTypeMapInterface = (objectTypes: Iterator<string>) =>
	ts.factory.createInterfaceDeclaration(
		undefined,
		undefined, // [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('ResponseTypeMap'),
		undefined,
		undefined,
		[
			...pipe(
				objectTypes,
				filter((typeName) => !relayTypes.includes(typeName)),
				map((typeName) =>
					ts.factory.createPropertySignature(
						[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
						ts.factory.createIdentifier(typeName),
						undefined,
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(`${typeName}Response`)),
					),
				),
			),
		],
	);

/**
 * Generate utility type, for preserving nullable value,
 * from an extracted result type. Wrap `T` in `Maybe` if `U` is nullable.
 *
 * @example
 * type PreserveMaybe<T, U> = U extends null ? Maybe<T> : T;
 */
export const generatePreserveMaybeUtilityType = () =>
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('PreserveMaybe'),
		[
			ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('T')),
			ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('U')),
		],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('U')),
			ts.factory.createLiteralTypeNode(ts.factory.createNull()),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			]),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('ExtractResponseTypeLookup'),
		[
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('T'),
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
			),
		],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			ts.factory.createTypeOperatorNode(
				ts.SyntaxKind.KeyOfKeyword,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResponseTypeMap'))
			),
			ts.factory.createIndexedAccessTypeNode(
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResponseTypeMap')),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			),
			ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('ExtractResponseType'),
		[ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('T'))],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			ts.factory.createTypeLiteralNode([
				ts.factory.createPropertySignature(
					[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
					ts.factory.createStringLiteral(' $__typename'),
					undefined,
					ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				),
			]),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('PreserveMaybe'), [
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ExtractResponseTypeLookup'), [
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('NonNullable'), [
						ts.factory.createIndexedAccessTypeNode(
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Required'), [
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
							]),
							ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(' $__typename')),
						),
					]),
				]),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			]),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('ResponseTypeLookup'),
		[ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('T'))],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ReadonlyArray'), [
				ts.factory.createInferTypeNode(
					ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('E')),
				),
			]),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('PreserveMaybe'), [
				ts.factory.createTypeOperatorNode(
					ts.SyntaxKind.ReadonlyKeyword,
					ts.factory.createArrayTypeNode(
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ExtractResponseType'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('E')),
						]),
					),
				),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
			]),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ExtractResponseType'), [
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		undefined,
		ts.factory.createIdentifier('ResponseType'),
		[
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('T'),
				ts.factory.createTypeLiteralNode([
					ts.factory.createPropertySignature(
						[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
						ts.factory.createStringLiteral(' $__typename'),
						undefined,
						ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
					),
				]),
			),
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('TResolvers'),
				ts.factory.createTypeLiteralNode([]),
				ts.factory.createTypeLiteralNode([]),
			),
		],
		ts.factory.createIntersectionTypeNode([
			ts.factory.createMappedTypeNode(
				ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword),
				ts.factory.createTypeParameterDeclaration(
					ts.factory.createIdentifier('P'),
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Exclude'), [
						ts.factory.createTypeOperatorNode(
							ts.SyntaxKind.KeyOfKeyword,
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
						),
						ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(' $__typename')),
					]),
				),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResponseTypeLookup'), [
					ts.factory.createIndexedAccessTypeNode(
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('P')),
					),
				]),
			),
			ts.factory.createTypeLiteralNode([
				ts.factory.createPropertySignature(
					[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
					ts.factory.createIdentifier('__typename'),
					undefined,
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('NonNullable'), [
						ts.factory.createIndexedAccessTypeNode(
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T')),
							ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(' $__typename')),
						),
					]),
				),
			]),
			ts.factory.createMappedTypeNode(
				ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword),
				ts.factory.createTypeParameterDeclaration(
					ts.factory.createIdentifier('P'),
					ts.factory.createTypeOperatorNode(
						ts.SyntaxKind.KeyOfKeyword,
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResolvers')),
					),
				),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResponseTypeLookup'), [
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverReturnType'), [
						ts.factory.createIndexedAccessTypeNode(
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TResolvers')),
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('P')),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('PageInfo'),
		undefined,
		undefined,
		[
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('endCursor'),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
					ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				]),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('hasNextPage'),
				undefined,
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('hasPreviousPage'),
				undefined,
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('startCursor'),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
					ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				]),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('Node'),
		undefined,
		undefined,
		[
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('id'),
				undefined,
				ts.factory.createIndexedAccessTypeNode(
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Scalars')),
					ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('ID')),
				),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('Edge'),
		[
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('TNode'),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Node')),
			),
		],
		undefined,
		[
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('cursor'),
				undefined,
				ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('node'),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TNode')),
				]),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('ConnectionDirection'),
		undefined,
		ts.factory.createUnionTypeNode([
			ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('backward')),
			ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('forward')),
			ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('both')),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('ForwardConnectionArgs'),
		undefined,
		undefined,
		[
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('after'),
				ts.factory.createToken(ts.SyntaxKind.QuestionToken),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
					ts.factory.createIndexedAccessTypeNode(
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Scalars')),
						ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('String')),
					),
				]),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('first'),
				ts.factory.createToken(ts.SyntaxKind.QuestionToken),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
					ts.factory.createIndexedAccessTypeNode(
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Scalars')),
						ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('Int')),
					),
				]),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('BackwardConnectionArgs'),
		undefined,
		undefined,
		[
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('before'),
				ts.factory.createToken(ts.SyntaxKind.QuestionToken),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
					ts.factory.createIndexedAccessTypeNode(
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Scalars')),
						ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('String')),
					),
				]),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('last'),
				ts.factory.createToken(ts.SyntaxKind.QuestionToken),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
					ts.factory.createIndexedAccessTypeNode(
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Scalars')),
						ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('Int')),
					),
				]),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('ConnectionArgsMap'),
		undefined,
		undefined,
		[
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('backward'),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('BackwardConnectionArgs')),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('both'),
				undefined,
				ts.factory.createIntersectionTypeNode([
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('BackwardConnectionArgs')),
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ForwardConnectionArgs')),
				]),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('forward'),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ForwardConnectionArgs')),
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
	ts.factory.createTypeAliasDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('ConnectionArgs'),
		[
			ts.factory.createTypeParameterDeclaration(ts.factory.createIdentifier('TArgs')),
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('TDirection'),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ConnectionDirection')),
				ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('forward')),
			),
		],
		ts.factory.createConditionalTypeNode(
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
			ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
			ts.factory.createIndexedAccessTypeNode(
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ConnectionArgsMap')),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TDirection')),
			),
			ts.factory.createIntersectionTypeNode([
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TArgs')),
				ts.factory.createIndexedAccessTypeNode(
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ConnectionArgsMap')),
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TDirection')),
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
	ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier('Connection'),
		[
			ts.factory.createTypeParameterDeclaration(
				ts.factory.createIdentifier('TNode'),
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Node')),
			),
		],
		undefined,
		[
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('edges'),
				undefined,
				ts.factory.createTypeOperatorNode(
					ts.SyntaxKind.ReadonlyKeyword,
					ts.factory.createArrayTypeNode(
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Edge'), [
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('TNode')),
						]),
					),
				),
			),
			ts.factory.createPropertySignature(
				[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
				ts.factory.createIdentifier('pageInfo'),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('PageInfo')),
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
	isOptional ? ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [node]) : node;

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
	ts.factory.createIndexedAccessTypeNode(
		ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Scalars')),
		ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(typeName)),
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
	ts.factory.createTypeReferenceNode(
		ts.factory.createIdentifier(typeName),
		typeArgs == null || typeArgs.length === 0
			? undefined
			: typeArgs.map((typeArg) => ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(typeArg))),
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
	ts.factory.createTypeOperatorNode(ts.SyntaxKind.ReadonlyKeyword, ts.factory.createArrayTypeNode(node));

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

type CreateTypeFromNode = (node: NamedTypeNode | ListTypeNode | NonNullTypeNode) => ts.TypeNode;
type PrivateCreateTypeFromNode = (
	node: NamedTypeNode | ListTypeNode | NonNullTypeNode,
	nullable: boolean,
) => ts.TypeNode;
const createTypeFromNode: CreateTypeFromNode = (
	node: NamedTypeNode | ListTypeNode | NonNullTypeNode,
	nullable = true,
): ts.TypeNode => {
	switch (node.kind) {
		case Kind.NAMED_TYPE:
			return createMaybeType(
				isScalarType(node.name.value) ? createScalarType(node.name.value) : createNamedType(node.name.value),
				nullable,
			);
		case Kind.LIST_TYPE:
			return createListType(createTypeFromNode(node.type));
		case Kind.NON_NULL_TYPE:
			return (createTypeFromNode as PrivateCreateTypeFromNode)(node.type, false);
		default:
			return assertNever(node, `Unknown node kind: ${node == null ? 'NULL' : node!.kind ?? 'NULL'}`);
	}
};

const resolveRelayInterfaceTypeArgs = (interfaceName: string, typeName: string): string[] | undefined => {
	switch (true) {
		case interfaceName.endsWith('Edge'):
			return [typeName.substr(0, typeName.length - 'Edge'.length)];
		case interfaceName.endsWith('Connection'):
			return [typeName.substr(0, typeName.length - 'Connection'.length)];
		default:
			return undefined;
	}
};

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
 * export interface Viewer extends Node {
 *     readonly " $__typename": "Viewer";
 *     readonly id: Scalars['ID'];
 *     readonly name: Maybe<Scalars['String']>;
 * }
 * ````
 */
export const generateObjectType = (context: GenerateSchemaContext, typeName: string) => {
	const interfaces = context.typeInfo.getInterfacesForObjectType(typeName);
	const description = context.typeInfo.getTypeDescription(typeName);

	return addNodeCommentBlock(
		description,
		ts.factory.createInterfaceDeclaration(
			undefined,
			[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
			ts.factory.createIdentifier(typeName),
			undefined,
			interfaces.size === 0
				? undefined
				: [
						ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
							...pipe(
								interfaces.keys(),
								map((iface) =>
									ts.factory.createExpressionWithTypeArguments(
										ts.factory.createIdentifier(iface),
										resolveRelayInterfaceTypeArgs(iface, typeName)?.map((typeArg) =>
											ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(typeArg)),
										),
									),
								),
							),
						]),
				  ],
			[
				...(context.typeInfo.isInterfaceType(typeName)
					? []
					: [
							ts.factory.createPropertySignature(
								[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
								ts.factory.createStringLiteral(' $__typename'),
								undefined,
								ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(typeName)),
							),
					  ]),
				...pipe(
					context.typeInfo.getFieldDefinitions(typeName),
					filter(not(isResolver)),
					map((field) =>
						addNodeCommentBlock(
							field.description?.value,
							ts.factory.createPropertySignature(
								[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
								ts.factory.createIdentifier(field.name.value),
								undefined,
								createTypeFromNode(field.type),
							),
						),
					),
				),
			],
		),
	);
};

const isResolver = (field: FieldDefinitionNode) =>
	(field.arguments != null && field.arguments.length > 0) ||
	(field.directives != null && field.directives.find((d) => d.name.value === 'resolve') != null);

export const generateObjectTypeFieldResolvers = (
	context: GenerateSchemaContext,
	typeName: string,
): Iterable<ts.InterfaceDeclaration | ts.TypeAliasDeclaration> =>
	pipe(
		context.typeInfo.getFieldDefinitions(typeName),
		filter(isResolver),
		map((field) => [
			ts.factory.createTypeAliasDeclaration(
				undefined,
				[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
				ts.factory.createIdentifier(capitalize(typeName, field.name.value, 'Args')),
				undefined,
				field.arguments == null || field.arguments.length === 0
					? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
					: ts.factory.createTypeLiteralNode(
							field.arguments.map(
								(arg) =>
									ts.factory.createPropertySignature(
										[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
										ts.factory.createIdentifier(arg.name.value),
										undefined,
										createTypeFromNode(arg.type),
									),
							),
					  ),
			),
			ts.factory.createTypeAliasDeclaration(
				undefined,
				[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
				ts.factory.createIdentifier(capitalize(typeName, field.name.value, 'Resolver')),
				undefined,
				ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResolverFn'), [
					createTypeFromNode(field.type),
					ts.factory.createTypeReferenceNode(
						ts.factory.createIdentifier(context.typeInfo.isOperationType(typeName) ? 'Root' : typeName),
					),
					ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Context')),
					ts.factory.createTypeReferenceNode(
						ts.factory.createIdentifier(capitalize(typeName, field.name.value, 'Args')),
					),
				]),
			),
		]),
		flatMap(),
		just(
			ts.factory.createInterfaceDeclaration(
				undefined,
				[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
				ts.factory.createIdentifier(capitalize(typeName, 'Resolvers')),
				undefined,
				undefined,
				[
					...pipe(
						context.typeInfo.getFieldDefinitions(typeName),
						filter(isResolver),
						map((field) =>
							ts.factory.createPropertySignature(
								[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
								ts.factory.createIdentifier(field.name.value),
								undefined,
								ts.factory.createTypeReferenceNode(
									ts.factory.createIdentifier(capitalize(typeName, field.name.value, 'Resolver')),
								),
							),
						),
					),
				],
			),
		),
	);

export const generateInputObjectType = (context: GenerateSchemaContext, typeName: string) =>
	addNodeCommentBlock(
		context.typeInfo.getInputObjectTypeDescription(typeName),
		ts.factory.createInterfaceDeclaration(
			undefined,
			[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
			ts.factory.createIdentifier(typeName),
			undefined,
			undefined,
			[
				...pipe(
					context.typeInfo.getInputFieldDefinitions(typeName),
					map((field) =>
						addNodeCommentBlock(
							field.description?.value,
							ts.factory.createPropertySignature(
								[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
								ts.factory.createIdentifier(field.name.value),
								undefined,
								createTypeFromNode(field.type),
							),
						),
					),
				),
			],
		),
	);

export const generateInputObjectTypes = (context: GenerateSchemaContext) =>
	pipe(
		context.typeInfo.inputObjectDefinitions.keys(),
		map((typeName) => generateInputObjectType(context, typeName)),
	);

export const generateInterfaceOutputTypes = (context: GenerateSchemaContext) =>
	pipe(
		context.typeInfo.interfaceDefinitions.keys(),
		filter((typeName) => !relayTypes.includes(typeName)),
		map((typeName) => generateObjectType(context, typeName)),
	);

export const generateObjectOutputTypes = (context: GenerateSchemaContext) =>
	pipe(
		context.typeInfo.objectDefinitions.keys(),
		filter((typeName) => !relayTypes.includes(typeName)),
		map((typeName) => generateObjectType(context, typeName)),
	);

export const generateObjectTypeResolvers = (context: GenerateSchemaContext) =>
	pipe(
		context.typeInfo.objectDefinitions.keys(),
		filter((typeName) => !relayTypes.includes(typeName)),
		map((typeName) => generateObjectTypeFieldResolvers(context, typeName)),
		flatMap(),
	);

const generateObjectResponseType = (typeName: string) =>
	ts.factory.createTypeAliasDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier(capitalize(typeName, 'Response')),
		undefined,
		ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ResponseType'), [
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(typeName)),
			ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(capitalize(typeName, 'Resolvers'))),
		]),
	);

export const generateObjectResponseTypes = (context: GenerateSchemaContext) =>
	pipe(
		context.typeInfo.objectDefinitions.keys(),
		filter((typeName) => !relayTypes.includes(typeName)),
		map((typeName) => generateObjectResponseType(typeName)),
	);
