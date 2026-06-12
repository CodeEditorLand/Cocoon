/**
 * @module Handler/VscodeAPI/Window/Registry
 *
 * Shared mutable Maps that back vscode.window provider registrations.
 * Exported from one canonical location so that Window/Namespace.ts,
 * RequestRoutingHandler, NotificationHandler, and tests all reference the
 * same runtime instances rather than each carrying a separate copy.
 *
 * Each Map is keyed by the numeric handle (as a string) assigned at
 * registration time via NextProviderHandle(). Mountain always refers back
 * to providers by this handle so lookups are O(1).
 */

/** Tree-data providers keyed by handle. Used by tree:getChildren routing. */
export const TreeDataProviders = new Map<string, any>(;

/**
 * Same providers indexed by viewId. Mountain's `$provideTreeChildren` keys
 * on viewId (not the Cocoon-side counter) so both maps must be updated
 * together in register and dispose paths.
 */
export const TreeDataProvidersByViewId = new Map<string, any>(;

/** Webview-view providers keyed by handle. */
export const WebviewViewProviders = new Map<string, any>(;

/**
 * Per-handle factory that returns a fresh `WebviewView` proxy for the
 * extension's `resolveWebviewView(view, ctx)` callback. Indexed in lockstep
 * with WebviewViewProviders so the `webview.resolveView` handler can find
 * both in one step.
 */
export const WebviewViewBuilders = new Map<string, () => any>(;

/**
 * Custom editor providers keyed by numeric handle string.
 * Pair of `{ Provider, Readonly, Handle }` is also kept in
 * CustomEditorProvidersByViewType for reverse-RPC routing.
 */
export const CustomEditorProviders = new Map<string, any>(;

export const CustomEditorProvidersByViewType = new Map<
	string,

	{ Provider: any; Readonly: boolean; Handle: number }
>(;

/** Active webview panels keyed by handle. */
export const WebviewPanels = new Map<string, any>(;
