/**
 * @module Services/Window
 * @description
 * Barrel export for Window service modules.
 *
 * Consumers should import from this barrel or from the specific sub-module.
 * The main service class is exported from Index.ts.
 */

// Error types
export * from "./Errors.js";

// Interface/type declarations
export type { Logger, Window, Workspace, VSCodeWindowAPI } from "./Interfaces.js";

// Main service class (default + named)
export { WindowService, WindowService as default } from "./Index.js";

// Implementation modules (available for direct use or testing)
export {
	ShowTextDocument,
	ShowInformationMessage,
	ShowWarningMessage,
	ShowErrorMessage,
} from "./TextDocument.js";
export { ShowQuickPick, ShowInputBox } from "./QuickInput.js";
export { ShowOpenDialog, ShowSaveDialog } from "./FileDialogs.js";
export { CreateStatusBarItem } from "./StatusBar.js";
export { CreateOutputChannel } from "./OutputChannel.js";
export { CreateWebviewPanel } from "./WebviewPanel.js";
export { WithProgress } from "./Progress.js";
