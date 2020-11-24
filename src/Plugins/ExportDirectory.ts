import { PluginContext, PluginGenerator, PluginValidateConfigContext } from '@zeroconf/codegen/Runner';
import { basename, dirname, extname, join } from 'path';
import { OutputConfig } from '@zeroconf/codegen/Config';
import { filterNonNull, getModulePath, isWildcardPath, ModulePath } from '@zeroconf/codegen/Util';
import * as ts from 'typescript';
import {
	addHeaderComment,
	createSourceFile,
	defaultHeaderComment,
	printSourceFile,
} from '@zeroconf/codegen/Typescript';

export enum ExportType {
	ReExport = 'ReExport',
	SingletonClass = 'SingletonClass',
}

export interface GenerateOptionsBase {
	exportTemplate?: Maybe<string>;
	exportType: ExportType;
	headerComment?: Maybe<string>;
	importPrefix: string;
	importTemplate?: Maybe<string>;
}

interface GenerateReExport {
	exportType: ExportType.ReExport;
}

interface ConstructorParameter {
	paramName: string;
	paramType: string;
}

type GenerateSingletonClass = {
	additionalImports?: Maybe<string[]>;
	className?: Maybe<string>;
	constructorParameters?: ConstructorParameter[];
	defaultExport?: boolean;
	exportType: ExportType.SingletonClass;
} & ({ className: string; defaultExport?: boolean } | { className?: Maybe<string>; defaultExport: true });

export type GenerateOptions = GenerateOptionsBase & (GenerateReExport | GenerateSingletonClass);

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

export async function* plugin(ctx: PluginContext): PluginGenerator {
	ctx.yieldUntil(ctx.phases.validateConfig);

	const config = await ctx.validate.runConfigValidation<GenerateOptions>(validateConfig);

	ctx.yieldUntil(ctx.phases.loadInput);
	yield;

	const importExportMap = await ctx.load.loadInputFiles((inputStream) => compileImportExportMap(inputStream, config));
	ctx.yieldUntil(ctx.phases.generate);
	yield;

	const outputFile = compileOutputFile(createSourceFile(), config, importExportMap);

	ctx.yieldUntil(ctx.phases.emit);
	yield;

	await ctx.emit.writeOutput(
		async ({ outputFileStream }): Promise<void> => {
			printSourceFile(outputFile, outputFileStream);
		},
	);

	ctx.yieldUntil(ctx.phases.cleanup);
	yield;
}

function compileOutputFile(
	outputFile: ts.SourceFile,
	config: GenerateOptions,
	importExportMap: ImportExportMap,
): ts.SourceFile {
	const { headerComment } = config;

	const compiledSourceFile = ts.factory.updateSourceFile(
		outputFile,
		config.exportType === ExportType.SingletonClass
			? compileSingletonClass(config.className, config, importExportMap)
			: compileExportDeclarations(importExportMap),
		false,
	);

	return addHeaderComment(compiledSourceFile, headerComment ?? defaultHeaderComment);
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
	className: Maybe<string> | undefined,
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

/**
 * export [default] class ClassName {}
 */
function createSingletonClass(className: Maybe<string> | undefined, defaultExport?: boolean) {
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

async function compileImportExportMap(inputStream: Stream<string>, config: GenerateOptions): Promise<ImportExportMap> {
	const { exportTemplate, importPrefix, importTemplate } = config;

	const importExportMap: ImportExportMap = {};

	for await (const filePath of inputStream) {
		const fileExtension = extname(filePath.toString());
		const fileName = basename(filePath.toString(), fileExtension);
		const directoryName = dirname(filePath.toString());

		const variables = {
			directoryName,
			fileExtension,
			fileName,
		};

		const importName = compileImportName(importTemplate ?? defaultImportTemplate, variables);
		const exportName = compileExportName(exportTemplate, variables) ?? importName;

		importExportMap[compileImportPath(join(directoryName, fileName), importPrefix)] = {
			defaultImport: importName === 'default',
			exportName,
			importName: importName === 'default' ? exportName : importName,
		};
	}
	return importExportMap;
}

function compileExportName(exportTemplate: Maybe<string> | undefined, variables: ImportExportVariable): string | null {
	return exportTemplate == null
		? null
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

async function validateConfig(
	ctx: PluginValidateConfigContext,
	rawConfig: unknown,
	outputConfig: OutputConfig,
): Promise<GenerateOptions> {
	if (isWildcardPath(outputConfig.outputPattern)) {
		throw new TypeError(`outputPattern must point to a single file, got: ${outputConfig.outputPattern}`);
	}

	ctx.assertObject(rawConfig, 'Must provide a config to the @zeroconf/codegen#ExportDirectory plugin');
	ctx.assertString(rawConfig.exportType, 'Missing exportType option in config');
	ctx.assertEnum<ExportType>(rawConfig.exportType, (exportType) => {
		switch (exportType) {
			case ExportType.ReExport:
			case ExportType.SingletonClass:
				return null;
			default:
				return `The exportType config option must be either ReExport or SingletonClass, got: ${exportType}`;
		}
	});
	ctx.assertMaybeString(
		rawConfig.exportTemplate,
		`The exportTemplate config option must be either a string or omitted, got: ${rawConfig.exportTemplate}`,
	);
	ctx.assertMaybeString(
		rawConfig.headerComment,
		`The headerComment config option must be either a string or omitted, got: ${rawConfig.headerComment}`,
	);
	ctx.assertString(
		rawConfig.importPrefix,
		`Must provide a valid string as importPrefix config option, got: ${rawConfig.importPrefix}`,
	);
	ctx.assertMaybeString(
		rawConfig.importTemplate,
		`The importTemplate config option must be either a string or omitted, got: ${rawConfig.importTemplate}`,
	);

	const baseOptions: GenerateOptionsBase = {
		exportTemplate: rawConfig.exportTemplate,
		exportType: rawConfig.exportType,
		headerComment: rawConfig.headerComment,
		importPrefix: rawConfig.importPrefix,
		importTemplate: rawConfig.importTemplate,
	};

	if (baseOptions.exportType === ExportType.ReExport) {
		return {
			...baseOptions,
			exportType: ExportType.ReExport,
		};
	} else {
		let exportOptions:
			| { className: string; defaultExport?: boolean | undefined }
			| { className?: undefined; defaultExport: true };

		ctx.assertMaybeBoolean(
			rawConfig.defaultExport,
			`The defaultExport config option must be either a boolean or omitted, got: ${rawConfig.defaultExport}`,
		);

		if (rawConfig.defaultExport) {
			ctx.assertMaybeString(
				rawConfig.className,
				`The className config option must be omitted when defaultExport is enabled, got: ${rawConfig.className}`,
			);
			exportOptions = {
				defaultExport: rawConfig.defaultExport,
				className: rawConfig.className ?? undefined,
			};
		} else {
			ctx.assertString(
				rawConfig.className,
				`When defaultExport is omitted or set to false, a className must be provided and be a valid string, got: ${rawConfig.className}`,
			);
			exportOptions = {
				className: rawConfig.className,
				defaultExport: rawConfig.defaultExport ?? undefined,
			};
		}

		ctx.assertMaybeStringArray(
			rawConfig.additionalImports,
			`The additionalImports config option must be either omitted or a list of strings, got: ${rawConfig.additionalImports}`,
		);

		ctx.assertMaybeStringArray(
			rawConfig.constructorParameters,
			`The constructorParameters config options must be either omitted or a list of string, got: ${rawConfig.constructorParameters}`,
		);

		const constructorParameters =
			rawConfig.constructorParameters == null
				? undefined
				: rawConfig.constructorParameters.map((param) => {
						const [paramName, paramType] = param.split('#');
						return { paramName, paramType };
				  });

		return {
			...baseOptions,
			...exportOptions,
			additionalImports: rawConfig.additionalImports,
			constructorParameters: constructorParameters,
			exportType: ExportType.SingletonClass,
		};
	}
}
