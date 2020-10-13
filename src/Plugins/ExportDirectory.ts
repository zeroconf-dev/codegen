import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';
import { filterNonNull, getModulePath, ModulePath } from '@zeroconf/codegen/Util';
import { basename, dirname, extname, join } from 'path';
import * as ts from 'typescript';
import {
	addHeaderComment,
	createSourceFile,
	defaultHeaderComment,
	printSourceFile,
} from '@zeroconf/codegen/Typescript';

enum ExportType {
	ReExport = 'ReExport',
	SingletonClass = 'SingletonClass',
}

interface GenerateOptionsBase {
	exportTemplate?: string;
	exportType: ExportType;
	headerComment?: string;
	importPrefix: string;
	importTemplate?: string;
}

interface GenerateReExport {
	exportType: ExportType.ReExport;
}

interface ConstructorParameter {
	paramName: string;
	paramType: string;
}

type GenerateSingletonClass = {
	additionalImports?: string[];
	className?: string;
	constructorParameters?: ConstructorParameter[];
	defaultExport?: boolean;
	exportType: ExportType.SingletonClass;
} & ({ className: string; defaultExport?: boolean } | { className?: string; defaultExport: true });

type GenerateOptions = GenerateOptionsBase & (GenerateReExport | GenerateSingletonClass);

type GenerateSingletonClassOptions = GenerateOptionsBase & GenerateSingletonClass;

interface ImportExportMap {
	[importPath: string]: {
		defaultImport?: boolean;
		exportName: string;
		importName: string;
	};
}

interface ImportExportVariable {
	directoryName: string;
	fileExtension: string;
	fileName: string;
}

const defaultImportTemplate = '${fileName}';

export const plugin: CodegenPlugin<GenerateOptions, { export: { filePaths: string[] } }> & {
	ExportType: typeof ExportType;
} = {
	ExportType: ExportType,
	config: async (config: any): Promise<GenerateOptions> => {
		return config as GenerateOptions;
	},
	generate: async (context, options): Promise<void> => {
		context.logger.info('Plugins/ExportDirectory');
		const { exportTemplate, importPrefix, importTemplate = defaultImportTemplate } = options;
		const outputFile = createSourceFile();

		const importExportMap: ImportExportMap = {};

		for await (const filePath of context.inputStream) {
			const fileExtension = extname(filePath.toString());
			const fileName = basename(filePath.toString(), fileExtension);
			const directoryName = dirname(filePath.toString());

			const variables = {
				directoryName,
				fileExtension,
				fileName,
			};

			const importName = compileImportName(importTemplate, variables);
			const exportName = compileExportName(exportTemplate, variables) ?? importName;

			importExportMap[compileImportPath(join(directoryName, fileName), importPrefix)] = {
				defaultImport: importName === 'default',
				exportName,
				importName: importName === 'default' ? exportName : importName,
			};
		}

		await compileOutputFile(outputFile, options, importExportMap, context.outputStream);
	},
};

function compileExportName(exportTemplate: string | undefined, variables: ImportExportVariable): string | undefined {
	return exportTemplate == null
		? exportTemplate
		: Object.entries(variables).reduce((result, [key, value]) => {
				return result.replace(`\${${key}}`, value);
		  }, exportTemplate);
}

function compileImportName(importTemplate: string, variables: ImportExportVariable): string {
	return Object.entries(variables).reduce((result, [key, value]) => {
		return result.replace(`\${${key}}`, value);
	}, importTemplate);
}

function compileImportPath(filePath: string, importPrefix: string): string {
	return join(importPrefix, filePath);
}

function compileExportDeclarations(importExportMap: ImportExportMap) {
	return Object.entries(importExportMap)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([importPath, { exportName, importName }]) =>
			ts.factory.createExportDeclaration(
				undefined,
				undefined,
				false,
				ts.factory.createNamedExports([
					ts.factory.createExportSpecifier(
						exportName === importName ? undefined : ts.factory.createIdentifier(importName),
						ts.factory.createIdentifier(exportName),
					),
				]),
				ts.factory.createStringLiteral(importPath),
			),
		);
}

function compileSingletonClass(
	className: string | undefined,
	options: GenerateSingletonClassOptions,
	importExportMap: ImportExportMap,
) {
	return [
		...createImportDeclarations(options, importExportMap),
		addPublicSingletonGetterProperties(
			addPublicConstructor(
				addPrivateReadonlyConstructorProperty(
					addPrivateSingletonProperties(
						createSingletonClass(className, options.defaultExport),
						importExportMap,
					),
					options,
				),
				options,
			),
			options,
			importExportMap,
		),
	];
}

async function compileOutputFile(
	outputFile: ts.SourceFile,
	options: GenerateOptions,
	importExportMap: ImportExportMap,
	outputStream: NodeJS.WritableStream,
): Promise<void> {
	const { headerComment = defaultHeaderComment } = options;

	const compiledSourceFile = ts.factory.updateSourceFile(
		outputFile,
		options.exportType === ExportType.SingletonClass
			? compileSingletonClass(options.className, options, importExportMap)
			: compileExportDeclarations(importExportMap),
		false,
	);

	await printSourceFile(addHeaderComment(compiledSourceFile, headerComment), outputStream);
}

/**
 * export [default] class ClassName {}
 */
function createSingletonClass(className: string | undefined, defaultExport?: boolean) {
	return ts.factory.createClassDeclaration(
		undefined,
		filterNonNull([
			ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
			defaultExport ? ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword) : null,
		]),
		className == null ? undefined : ts.factory.createIdentifier(className),
		undefined,
		undefined,
		[],
	);
}

function createImportDeclarations(options: GenerateSingletonClassOptions, importExportMap: ImportExportMap) {
	return ts.factory.createNodeArray(
		[
			...(options.additionalImports == null
				? []
				: options.additionalImports.map((ai) => getModulePath(ai) as ModulePath & { exportName?: string })),
			...Object.entries(importExportMap).map(([importPath, { defaultImport, importName, exportName }]) => ({
				defaultImport,
				exportName,
				importPath,
				importName,
			})),
		]
			.sort(
				(
					{ importPath: a, exportName: a2, importName: a3 },
					{ importPath: b, exportName: b2, importName: b3 },
				) => a.localeCompare(b) || (a2 ?? a3).localeCompare(b2 ?? b3),
			)
			.map(
				({
					exportName,
					importName,
					importPath,
					defaultImport,
				}: {
					exportName?: string;
					importName: string;
					importPath: string;
					defaultImport?: boolean;
				}) =>
					ts.factory.createImportDeclaration(
						undefined,
						undefined,
						ts.factory.createImportClause(
							false,
							defaultImport
								? ts.factory.createIdentifier(importName)
								: importName === 'default' && exportName != null
								? ts.factory.createIdentifier(exportName)
								: undefined,
							defaultImport
								? undefined
								: ts.factory.createNamedImports([
										ts.factory.createImportSpecifier(
											undefined,
											ts.factory.createIdentifier(importName),
										),
								  ]),
						),
						ts.factory.createStringLiteral(importPath),
					),
			),
	);
}

/**
 * private _PrivateSingletonVariable: Maybe<SingletonType> = null;
 */
function addPrivateSingletonProperties(
	classDecl: ts.ClassDeclaration,
	importExportMap: ImportExportMap,
): ts.ClassDeclaration {
	return ts.factory.updateClassDeclaration(
		classDecl,
		classDecl.decorators,
		classDecl.modifiers,
		classDecl.name,
		classDecl.typeParameters,
		classDecl.heritageClauses,
		[
			...classDecl.members,
			...Object.values(importExportMap)
				.sort(({ exportName: a }, { exportName: b }) => a.localeCompare(b))
				.reduce((result, { exportName: memberName, importName: memberType }) => {
					result.push(
						ts.factory.createPropertyDeclaration(
							undefined,
							[ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)],
							ts.factory.createIdentifier(`_${memberName}`),
							undefined,
							ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Maybe'), [
								ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(memberType), undefined),
							]),
							ts.factory.createNull(),
						),
					);
					return result;
				}, [] as ts.PropertyDeclaration[]),
		],
	);
}

/**
 * public readonly propertyName: PropertyType;
 */
function addPrivateReadonlyConstructorProperty(
	classDecl: ts.ClassDeclaration,
	options: GenerateSingletonClassOptions,
): ts.ClassDeclaration {
	const { constructorParameters } = options;
	if (constructorParameters == null) {
		return classDecl;
	}
	return ts.factory.updateClassDeclaration(
		classDecl,
		classDecl.decorators,
		classDecl.modifiers,
		classDecl.name,
		classDecl.typeParameters,
		classDecl.heritageClauses,
		[
			...classDecl.members,
			...constructorParameters
				.sort(({ paramName: a }, { paramName: b }) => a.localeCompare(b))
				.map((param) =>
					ts.factory.createPropertyDeclaration(
						undefined,
						[
							ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword),
							ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword),
						],
						ts.factory.createIdentifier(param.paramName),
						undefined,
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(param.paramType)),
						undefined,
					),
				),
		],
	);
}

/**
 * public constructor(paramName1: ParamType1, paramName2: ParamType2) {
 *     this.paramName1 = paramName1;
 *     this.paramName2 = paramName2;
 * }
 */
function addPublicConstructor(classDecl: ts.ClassDeclaration, options: GenerateSingletonClassOptions) {
	const { constructorParameters } = options;
	if (constructorParameters == null) {
		return classDecl;
	}

	return ts.factory.updateClassDeclaration(
		classDecl,
		classDecl.decorators,
		classDecl.modifiers,
		classDecl.name,
		classDecl.typeParameters,
		classDecl.heritageClauses,
		[
			...classDecl.members,
			ts.factory.createConstructorDeclaration(
				undefined,
				[ts.factory.createModifier(ts.SyntaxKind.PublicKeyword)],
				constructorParameters.map((param) =>
					ts.factory.createParameterDeclaration(
						undefined,
						undefined,
						undefined,
						ts.factory.createIdentifier(param.paramName),
						undefined,
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(param.paramType)),
					),
				),
				ts.factory.createBlock(
					constructorParameters.map((param) =>
						ts.factory.createExpressionStatement(
							ts.factory.createBinaryExpression(
								ts.factory.createPropertyAccessExpression(
									ts.factory.createThis(),
									ts.factory.createIdentifier(param.paramName),
								),
								ts.factory.createToken(ts.SyntaxKind.EqualsToken),
								ts.factory.createIdentifier(param.paramName),
							),
						),
					),
					true,
				),
			),
		],
	);
}

/**
 * public get SingletonGetter(): SingletonType {
 *     if (this._privateSingletonVariable == null) {
 *         this._privateSingletonVariable = new SingletonType(param1);
 *     }
 *     return this._privateSingletonVariable;
 * }
 */
function addPublicSingletonGetterProperties(
	classDecl: ts.ClassDeclaration,
	options: GenerateSingletonClassOptions,
	importExportMap: ImportExportMap,
) {
	const { constructorParameters } = options;
	return ts.factory.updateClassDeclaration(
		classDecl,
		classDecl.decorators,
		classDecl.modifiers,
		classDecl.name,
		classDecl.typeParameters,
		classDecl.heritageClauses,
		[
			...classDecl.members,
			...Object.values(importExportMap)
				.sort(({ exportName: a }, { exportName: b }) => a.localeCompare(b))
				.map(({ exportName: memberName, importName: memberType }) =>
					ts.factory.createGetAccessorDeclaration(
						undefined,
						[ts.factory.createModifier(ts.SyntaxKind.PublicKeyword)],
						ts.factory.createIdentifier(memberName),
						[],
						ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(memberType), undefined),
						ts.factory.createBlock(
							[
								ts.factory.createIfStatement(
									ts.factory.createBinaryExpression(
										ts.factory.createPropertyAccessExpression(
											ts.factory.createThis(),
											ts.factory.createIdentifier(`_${memberName}`),
										),
										ts.factory.createToken(ts.SyntaxKind.EqualsEqualsToken),
										ts.factory.createNull(),
									),
									ts.factory.createBlock(
										[
											ts.factory.createExpressionStatement(
												ts.factory.createBinaryExpression(
													ts.factory.createPropertyAccessExpression(
														ts.factory.createThis(),
														ts.factory.createIdentifier(`_${memberName}`),
													),
													ts.factory.createToken(ts.SyntaxKind.EqualsToken),
													ts.factory.createNewExpression(
														ts.factory.createIdentifier(memberType),
														undefined,
														constructorParameters == null
															? undefined
															: constructorParameters.map((param) =>
																	ts.factory.createPropertyAccessExpression(
																		ts.factory.createThis(),
																		ts.factory.createIdentifier(param.paramName),
																	),
															  ),
													),
												),
											),
										],
										true,
									),
									undefined,
								),
								ts.factory.createReturnStatement(
									ts.factory.createPropertyAccessExpression(
										ts.factory.createThis(),
										ts.factory.createIdentifier(`_${memberName}`),
									),
								),
							],
							true,
						),
					),
				),
		],
	);
}
