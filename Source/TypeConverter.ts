/*
 * File: Cocoon/Source/TypeConverter.ts
 * Responsibility: Manages the initialization of loggers for all type converter modules, ensuring proper logging for debugging and monitoring type conversion operations across the code editor.
 * Modified: 2025-06-07 00:57:31 UTC
 * Dependency: ./TypeConverter/Main, ./TypeConverter/WorkspaceEdit, vs/platform/log/common/log
 * Export: InitializeConverterLogger
 */

// This file serves as the main entry point for the TypeConverter module,
// re-exporting all specific converter implementations and providing a
// centralized initialization function for their loggers.

import type { ILogService } from "vs/platform/log/common/log";

import { InitializeConverterLogger as InitializeMainConverterLogger } from "./TypeConverter/Main";
import { InitializeWorkspaceEditConverterLogger } from "./TypeConverter/WorkspaceEdit";

// Re-export all type converters from their respective modules.
export * from "./TypeConverter/Main";
export * from "./TypeConverter/Completion";
export * from "./TypeConverter/CodeAction";
export * from "./TypeConverter/LanguageFeatures";
export * from "./TypeConverter/WorkspaceEdit";

/**
 * Initialize the logger for all type converter modules.
 * This ensures that any logging within the converters uses the main
 * application's log service instance.
 * @param Logger The log service instance to use.
 */
export const InitializeConverterLogger = (Logger?: ILogService): void => {
	InitializeMainConverterLogger(Logger);
	InitializeWorkspaceEditConverterLogger(Logger);
	// Note: Other converter files (Completion, CodeAction, etc.) did not have their
	// own logger initialization functions in the provided source, so they are not called here.
	// They likely rely on the logger being set in the Main converter.
	console.log("[TypeConverter] All converter loggers have been initialized.");
};
