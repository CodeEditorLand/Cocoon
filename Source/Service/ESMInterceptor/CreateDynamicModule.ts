/**
 * @module CreateDynamicModule (ESMInterceptor)
 * @description Generates the full JavaScript source code for a dynamic 'vscode'
 * ESM module by populating a template with an API key and export statements.
 */

import type * as VSCode from "vscode";

import { ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME } from "./Constants.js";
import { DynamicModuleTemplate } from "./DynamicModuleTemplate.js";

/**
 * Creates the script for a dynamic 'vscode' module.
 *
 * This function dynamically generates the source code that will be served via a
 * data URI when an extension performs an `import 'vscode'` call. It reflects
 * on the provided API instance to generate named exports for all of its
 * properties, ensuring full ESM compatibility.
 *
 * @param APIKey The unique key for retrieving the extension-specific `vscode` API instance
 *   from the global scope.
 * @param VSCodeAPI The actual `vscode` API object to export from this dynamic module.
 * @returns A string containing the complete JavaScript code for the dynamic module.
 */
const CreateDynamicModule = (
	APIKey: string,
	VSCodeAPI: typeof VSCode,
): string => {
	// Get all enumerable properties from the provided vscode API object.
	const ExportablePropertyNames = Object.keys(VSCodeAPI);

	// Generate an `export const ...` statement for each property.
	const ExportStatements = ExportablePropertyNames.map(
		(PropertyName) =>
			`export const ${PropertyName} = VSCodeAPI['${PropertyName}'];`,
	).join("\n");

	// Populate the template with the dynamic values.
	return DynamicModuleTemplate.replace(
		// Placeholder in the template
		"__BUILD_TIME_GLOBAL_API_FUNCTION_NAME__",
		`'${ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME}'`,
	)
		.replace("__RUNTIME_API_KEY__", `'${APIKey}'`)
		.replace("__RUNTIME_EXPORT_STATEMENTS__", ExportStatements);
};

export default CreateDynamicModule;
