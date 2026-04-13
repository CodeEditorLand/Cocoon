/**
 * @module Type
 * @description
 * Single source of truth for all VS Code runtime type constructors in Cocoon.
 * Re-exports the compiled VS Code source from @codeeditorland/output -
 * no hand-written shims, no local reimplementations.
 *
 * All TypeConverter modules import from here so that there is exactly one
 * place to update when the Output package changes.
 *
 * Coverage:
 *  - extHostTypes.js  → Position, Range, Location, Selection, MarkdownString,
 *                       Hover, CompletionItem, Diagnostic, TextEdit, WorkspaceEdit,
 *                       Task, ProcessExecution, ThemeColor, ThemeIcon, TreeItem,
 *                       TreeItemCollapsibleState, ViewColumn, Disposable, … (full barrel)
 *  - uri.js           → URI  (exposed as `Uri` in the vscode public API)
 *  - cancellation.js  → CancellationToken, CancellationTokenSource
 */

// Full VS Code extHostTypes barrel - every constructor and enum extension code uses.
export * from "@codeeditorland/output/vs/workbench/api/common/extHostTypes";

// URI is imported internally by extHostTypes but not re-exported; add it explicitly.
export { URI } from "@codeeditorland/output/vs/base/common/uri";

// Cancellation primitives.
export {
	CancellationToken,
	CancellationTokenSource,
} from "@codeeditorland/output/vs/base/common/cancellation";
