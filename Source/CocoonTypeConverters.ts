// Initialize logger for all if needed (or each file can init its own if _converterLogService is passed around)
import { ILogService } from "vs/platform/log/common/log";

import { initializeConverterLogger as initMainLogger } from "./cocoon-type-converters-main";

/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters  - Central Export
 * --------------------------------------------------------------------------------------------
 * This module re-exports all type converters from their respective files.
 *--------------------------------------------------------------------------------------------*/

export * from "./cocoon-type-converters-main";
export * from "./cocoon-type-converters-completion";
export * from "./cocoon-type-converters-codeaction";
export * from "./cocoon-type-converters-languagefeatures";
export * from "./cocoon-type-converters-workspaceedit";

// import { initializeConverterLogger as initCompletionLogger } from './cocoon-type-converters-completion'; // If they had separate loggers

export function initializeAllConverterLoggers(logger?: ILogService): void {
	initMainLogger(logger);
	// Potentially initialize loggers for other modules if they don't share the main one.
	// For simplicity, the provided split uses a single global _converterLogService via the main file.
}

console.warn(
	"[Cocoon Type Converters] All converter modules loaded. Check individual files for stub warnings.",
);
