import { basename, extname, dirname, join } from 'path';
import { createSourceFile, printSourceFile, addHeaderComment, defaultHeaderComment } from '../Typescript';
import * as ts from 'typescript';
import { filterNonNull, getModulePath, ModulePath } from '@zeroconf/codegen/Util';
import { CodegenPlugin } from '@zeroconf/codegen/typings/Plugin';

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

type GenerateSingletonClass =
	& {
		additionalImports?: string[];
		className?: string;
		constructorParameters?: ConstructorParameter[];
		defaultExport?: boolean
		exportType: ExportType.SingletonClass;
	}
	& (
		| { className: string; defaultExport?: boolean; }
		| { className?: string; defaultExport: true; }
	)
	;

type GenerateOptions =
	& GenerateOptionsBase
	& (
		| GenerateReExport
		| GenerateSingletonClass
	)
	;

type GenerateSingletonClassOptions =
	& GenerateOptionsBase
	& GenerateSingletonClass
	;

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

const plugin: (
	& CodegenPlugin<GenerateOptions, { export: { filePaths: string[] }}>
	& {
		ExportType: typeof ExportType;
	}
) = {
	ExportType: ExportType,
	config: async (config: any): Promise<GenerateOptions> => {
		return config as GenerateOptions;
	},
	generate: async (context, options): Promise<void> => {
		context.logger.info('Plugins/ExportDirectory');
		const {
			exportTemplate,
			importPrefix,
			importTemplate = defaultImportTemplate,
		} = options;
		const outputFile = createSourceFile('');

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

		await compileOutputFile(
			outputFile,
			options,
			importExportMap,
			context.outputStream,
		);
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
		ts.createExportDeclaration(
			undefined,
			undefined,
			ts.createNamedExports([
				ts.createExportSpecifier(
					exportName === importName ? undefined : ts.createIdentifier(importName),
					ts.createIdentifier(exportName),
				),
			]),
			ts.createStringLiteral(importPath),
			false
		));
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
						importExportMap
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

	const compiledSourceFile = ts.updateSourceFileNode(
		outputFile,
		options.exportType === ExportType.SingletonClass
			? compileSingletonClass(options.className, options, importExportMap)
			: compileExportDeclarations(importExportMap),
		false,
	);

	await printSourceFile(
		addHeaderComment(compiledSourceFile, headerComment),
		outputStream,
	);
}

export = plugin;

/**
 * export [default] class ClassName {}
 */
function createSingletonClass(className: string | undefined, defaultExport?: boolean) {
	return ts.createClassDeclaration(
		undefined,
		filterNonNull([
			ts.createModifier(ts.SyntaxKind.ExportKeyword),
			defaultExport ? ts.createModifier(ts.SyntaxKind.DefaultKeyword) : null,
		]),
		className == null ? undefined : ts.createIdentifier(className),
		undefined,
		undefined,
		[]
	);
}

function createImportDeclarations(options: GenerateSingletonClassOptions, importExportMap: ImportExportMap) {
	return ts.createNodeArray(
		[
			...(options.additionalImports == null
				? []
				: options.additionalImports.map(ai => getModulePath(ai) as ModulePath & { exportName?: string })
			),
			...Object.entries(importExportMap)
				.map(([importPath, { defaultImport, importName, exportName }]) => ({
					defaultImport,
					exportName,
					importPath,
					importName,
				})),
		].sort((
			{ importPath: a, exportName: a2, importName: a3 },
			{ importPath: b, exportName: b2, importName: b3 }) =>
				a.localeCompare(b) || (a2 ?? a3).localeCompare(b2 ?? b3)
		)
		.map(({ exportName, importName, importPath, defaultImport }: { exportName?: string, importName: string, importPath: string, defaultImport?: boolean }) =>
			ts.createImportDeclaration(
				undefined,
				undefined,
				ts.createImportClause(
					defaultImport ? ts.createIdentifier(importName) : importName === 'default' && exportName != null ? ts.createIdentifier(exportName) : undefined,
					defaultImport ? undefined : ts.createNamedImports([
						ts.createImportSpecifier(
							undefined,
							ts.createIdentifier(importName),
						),
					]),
					false,
				),
				ts.createStringLiteral(importPath),
			),
		),
	);
}

/**
 * private _PrivateSingletonVariable: Maybe<SingletonType> = null;
 */
function addPrivateSingletonProperties(classDecl: ts.ClassDeclaration, importExportMap: ImportExportMap): ts.ClassDeclaration {
	return ts.updateClassDeclaration(
		classDecl,
		classDecl.decorators,
		classDecl.modifiers,
		classDecl.name,
		classDecl.typeParameters,
		classDecl.heritageClauses,
		[
			...classDecl.members,
			...Object.values(importExportMap)
				.sort(({exportName: a}, {exportName: b}) => a.localeCompare(b))
				.reduce((result, { exportName: memberName, importName: memberType }) => {
				result.push(ts.createProperty(
					undefined,
					[ts.createModifier(ts.SyntaxKind.PrivateKeyword)],
					ts.createIdentifier(`_${memberName}`),
					undefined,
					ts.createTypeReferenceNode(
						ts.createIdentifier('Maybe'),
						[ts.createTypeReferenceNode(
							ts.createIdentifier(memberType),
							undefined,
						)],
					),
					ts.createNull(),
				));
				return result;
			}, [] as ts.PropertyDeclaration[]),
		],
	);
}

/**
 * public readonly propertyName: PropertyType;
 */
function addPrivateReadonlyConstructorProperty(classDecl: ts.ClassDeclaration, options: GenerateSingletonClassOptions): ts.ClassDeclaration {
	const { constructorParameters } = options;
	if (constructorParameters == null) {
		return classDecl;
	}
	return ts.updateClassDeclaration(
		classDecl,
		classDecl.decorators,
		classDecl.modifiers,
		classDecl.name,
		classDecl.typeParameters,
		classDecl.heritageClauses,
		[
			...classDecl.members,
			...constructorParameters
				.sort(({paramName: a}, {paramName: b}) => a.localeCompare(b))
				.map(param => ts.createProperty(
				undefined,
				[
					ts.createModifier(ts.SyntaxKind.PrivateKeyword),
					ts.createModifier(ts.SyntaxKind.ReadonlyKeyword),
				],
				ts.createIdentifier(param.paramName),
				undefined,
				ts.createTypeReferenceNode(
					ts.createIdentifier(param.paramType),
					undefined,
				),
				undefined,
			)),
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

	return ts.updateClassDeclaration(
		classDecl,
		classDecl.decorators,
		classDecl.modifiers,
		classDecl.name,
		classDecl.typeParameters,
		classDecl.heritageClauses,
		[
			...classDecl.members,
			ts.createConstructor(
				undefined,
				[ts.createModifier(ts.SyntaxKind.PublicKeyword)],
				constructorParameters.map(param => ts.createParameter(
					undefined,
					undefined,
					undefined,
					ts.createIdentifier(param.paramName),
					undefined,
					ts.createTypeReferenceNode(
						ts.createIdentifier(param.paramType),
						undefined,
					),
					undefined,
				)),
				ts.createBlock(
					constructorParameters.map(param => ts.createExpressionStatement(ts.createBinary(
						ts.createPropertyAccess(
							ts.createThis(),
							ts.createIdentifier(param.paramName),
						),
						ts.createToken(ts.SyntaxKind.EqualsToken),
						ts.createIdentifier(param.paramName),
					))),
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
	return ts.updateClassDeclaration(
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
					ts.createGetAccessor(
						undefined,
						[ts.createModifier(ts.SyntaxKind.PublicKeyword)],
						ts.createIdentifier(memberName),
						[],
						ts.createTypeReferenceNode(
							ts.createIdentifier(memberType),
							undefined,
						),
						ts.createBlock(
							[
								ts.createIf(
									ts.createBinary(
										ts.createPropertyAccess(
											ts.createThis(),
											ts.createIdentifier(`_${memberName}`),
										),
										ts.createToken(ts.SyntaxKind.EqualsEqualsToken),
										ts.createNull(),
									),
									ts.createBlock(
										[ts.createExpressionStatement(ts.createBinary(
											ts.createPropertyAccess(
												ts.createThis(),
												ts.createIdentifier(`_${memberName}`),
											),
											ts.createToken(ts.SyntaxKind.EqualsToken),
											ts.createNew(
												ts.createIdentifier(memberType),
												undefined,
												constructorParameters == null
													? undefined
													: constructorParameters.map(param => ts.createPropertyAccess(
														ts.createThis(),
														ts.createIdentifier(param.paramName),
													),
												),
											),
										))],
										true,
									),
									undefined,
								),
								ts.createReturn(ts.createPropertyAccess(
									ts.createThis(),
									ts.createIdentifier(`_${memberName}`),
								)),
							],
							true,
						),
					),
			),
		],
	);
}
