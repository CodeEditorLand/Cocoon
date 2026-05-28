/**
 * @module MountainGRPCClientService
 * @deprecated 2026-05-26 - DEAD LAYER. `MountainGRPCClientLayer` (line ~1272)
 *   is exported but no `Bootstrap.ts` or `Effect.provide(...)` site in
 *   Cocoon imports it. Effect tags reference `MountainGRPCClientService`
 *   (`Workspace.ts`, `Window/Index.ts`) but, without the Layer provided,
 *   those Effect branches never resolve at runtime - the methods below
 *   never fire.
 *
 *   Worse, the gRPC method names used here (`showInformation`,
 *   `showWarning`, `showError`, `createStatusBarItem`, `setStatusBarText`,
 *   `createWebviewPanel`, `setWebviewHtml`, `getSecret`) do not match any
 *   Mountain handler. The real wire names live elsewhere:
 *
 *   - `Window.ShowMessage` - `Cocoon/Services/Window/Text/Document.ts`
 *   - `$statusBar:set` / `setStatusBarText` (alias) -
 *     `Cocoon/Services/Window/Status/Bar.ts`
 *   - `webview.create` / `webview.setHtml` -
 *     `Cocoon/Services/Handler/VscodeAPI/Window/CreateWebviewPanel.ts`
 *   - `secrets.get` / `secrets.store` / `secrets.delete` -
 *     `Cocoon/Services/Handler/Extension/Host/ActivateExtension.ts`
 *
 *   ---
 *
 * High-level Effect-TS wrapper service for Mountain gRPC operations.
 * Provides convenient methods for Cocoon services to call Mountain's Vine protocol methods.
 *
 * RESPONSIBILITIES:
 * - Wrap Mountain gRPC calls in Effect-TS for composability
 * - Provide type-safe methods for Window, Workspace, Command, and Secret Storage operations
 * - Handle error conversion from gRPC to Effect errors
 * - Support both live implementation (using MountainClientService) and mock for testing
 *
 * Protocol: /Element/Mountain/Proto/Vine.proto
 * Generated Types: /Element/Cocoon/Source/Generated/Vine.ts
 * Low-level Client: /Element/Cocoon/Source/Services/MountainClientService.ts
 */

import { Context, Effect, Layer } from "effect";

import { IMountainClientService } from "../../../Interfaces/I/Mountain/Client/Service.js";
import { Logger } from "../../Logger.js";

/**
 * Options for showing a text document
 */
export interface ShowTextDocumentOptions {
	uri: string;

	viewColumn?: number;

	preserveFocus?: boolean;

	preview?: boolean;

	selection?: {
		line: number;

		character: number;
	};
}

/**
 * Status bar item configuration
 */
export interface StatusBarItemOptions {
	id: string;

	text: string;

	tooltip?: string;
}

/**
 * Webview panel configuration
 */
export interface WebviewPanelOptions {
	viewType: string;

	title: string;

	iconPath?: string;

	viewColumn?: number;

	preserveFocus?: boolean;

	enableFindWidget?: boolean;

	retainContextWhenHidden?: boolean;

	localResourceRoots?: string[];

	html?: string;
}

/**
 * Text edit for applying document edits
 */
export interface TextEdit {
	range: {
		start: { line: number; character: number };

		end: { line: number; character: number };
	};

	newText: string;
}

/**
 * Mountain gRPC client service interface
 * Provides Effect-based wrappers for Mountain's Vine protocol operations
 */
export interface MountainGRPCClientService {
	readonly _serviceBrand: undefined;

	// ==================== Window Operations ====================

	/**
	 * Show a text document in the editor
	 * @param uri - URI of the document to show
	 * @param options - Display options (view column, preserve focus, etc.)
	 * @returns Effect<void, Error>
	 */
	showTextDocument(
		uri: string,

		options?: Partial<ShowTextDocumentOptions>,
	): Effect.Effect<void, Error>;

	/**
	 * Show an information message to the user
	 * @param message - The message to display
	 * @returns Effect<void, Error>
	 */
	showInformationMessage(message: string): Effect.Effect<void, Error>;

	/**
	 * Show a warning message to the user
	 * @param message - The message to display
	 * @returns Effect<void, Error>
	 */
	showWarningMessage(message: string): Effect.Effect<void, Error>;

	/**
	 * Show an error message to the user
	 * @param message - The message to display
	 * @returns Effect<void, Error>
	 */
	showErrorMessage(message: string): Effect.Effect<void, Error>;

	/**
	 * Create a status bar item
	 * @param options - Status bar item configuration
	 * @returns Effect<string, Error> - Returns the item ID
	 */
	createStatusBarItem(
		options: StatusBarItemOptions,
	): Effect.Effect<string, Error>;

	/**
	 * Set the text of a status bar item
	 * @param itemId - The ID of the status bar item
	 * @param text - The text to display
	 * @returns Effect<void, Error>
	 */
	setStatusBarText(itemId: string, text: string): Effect.Effect<void, Error>;

	/**
	 * Create a webview panel
	 * @param options - Webview panel configuration
	 * @returns Effect<number, Error> - Returns the panel handle
	 */
	createWebviewPanel(
		options: WebviewPanelOptions,
	): Effect.Effect<number, Error>;

	/**
	 * Set the HTML content of a webview panel
	 * @param handle - The webview panel handle
	 * @param html - The HTML content
	 * @returns Effect<void, Error>
	 */
	setWebviewHtml(handle: number, html: string): Effect.Effect<void, Error>;

	/**
	 * Post a message to a webview panel (fire-and-forget)
	 * @param handle - The webview panel handle
	 * @param message - The message to send (string or bytes)
	 * @returns Effect<void, Error>
	 */
	postWebviewMessage(
		handle: number,

		message: string | Uint8Array,
	): Effect.Effect<void, Error>;

	// ==================== Workspace Operations ====================

	/**
	 * Find files matching a pattern
	 * @param pattern - Glob pattern to match
	 * @param include - Include patterns (optional)
	 * @returns Effect<string[], Error> - Returns array of URIs
	 */
	findFiles(
		pattern: string,

		include?: string[],
	): Effect.Effect<string[], Error>;

	/**
	 * Find text in files
	 * @param pattern - Search pattern
	 * @param include - Include patterns
	 * @param exclude - Exclude patterns
	 * @returns Effect<any[], Error> - Returns array of text matches
	 */
	findTextInFiles(
		pattern: string,

		include?: string[],

		exclude?: string[],
	): Effect.Effect<any[], Error>;

	/**
	 * Open a document
	 * @param uri - URI of the document to open
	 * @param viewColumn - View column to open in (optional)
	 * @returns Effect<void, Error>
	 */
	openDocument(uri: string, viewColumn?: number): Effect.Effect<void, Error>;

	/**
	 * Save all open documents
	 * @param includeUntitled - Whether to include untitled files
	 * @returns Effect<void, Error>
	 */
	saveAll(includeUntitled?: boolean): Effect.Effect<void, Error>;

	/**
	 * Apply text edits to a document
	 * @param uri - URI of the document to edit
	 * @param edits - Array of text edits to apply
	 * @returns Effect<void, Error>
	 */
	applyEdit(uri: string, edits: TextEdit[]): Effect.Effect<void, Error>;

	// ==================== Command Operations ====================

	/**
	 * Register an extension command
	 * @param commandId - The command identifier
	 * @param extensionId - The extension ID
	 * @param title - The command title
	 * @returns Effect<void, Error>
	 */
	registerCommand(
		commandId: string,

		extensionId: string,

		title: string,
	): Effect.Effect<void, Error>;

	/**
	 * Execute a command
	 * @param commandId - The command identifier
	 * @param args - Command arguments
	 * @returns Effect<any, Error> - Returns the command result
	 */
	executeCommand(
		commandId: string,
		...args: any[]
	): Effect.Effect<any, Error>;

	/**
	 * Unregister a command
	 * @param commandId - The command identifier
	 * @returns Effect<void, Error>
	 */
	unregisterCommand(commandId: string): Effect.Effect<void, Error>;

	// ==================== Secret Storage ====================

	/**
	 * Retrieve a secret from storage
	 * @param key - The secret key
	 * @returns Effect<string | undefined, Error> - Returns the secret value or undefined
	 */
	getSecret(key: string): Effect.Effect<string | undefined, Error>;

	/**
	 * Store a secret in storage
	 * @param key - The secret key
	 * @param value - The secret value
	 * @returns Effect<void, Error>
	 */
	storeSecret(key: string, value: string): Effect.Effect<void, Error>;

	/**
	 * Delete a secret from storage
	 * @param key - The secret key
	 * @returns Effect<void, Error>
	 */
	deleteSecret(key: string): Effect.Effect<void, Error>;

	// ==================== File System Operations ====================

	/**
	 * Read file contents
	 * @param uri - URI of the file to read
	 * @returns Effect<Uint8Array, Error> - Returns file contents as bytes
	 */
	readFile(uri: string): Effect.Effect<Uint8Array, Error>;

	/**
	 * Write file contents
	 * @param uri - URI of the file to write
	 * @param content - File contents as bytes
	 * @param encoding - File encoding (optional)
	 * @returns Effect<void, Error>
	 */
	writeFile(
		uri: string,

		content: Uint8Array,

		encoding?: string,
	): Effect.Effect<void, Error>;

	/**
	 * Get file metadata
	 * @param uri - URI of the file
	 * @returns Effect<any, Error> - Returns file stat information
	 */
	stat(uri: string): Effect.Effect<any, Error>;

	/**
	 * Read directory contents
	 * @param uri - URI of the directory
	 * @returns Effect<string[], Error> - Returns array of entry names
	 */
	readdir(uri: string): Effect.Effect<string[], Error>;
}

/**
 * Service Tag for MountainGRPCClientService.
 *
 * @deprecated 2026-05-26 - referenced by `Workspace.ts` and
 *   `Window/Index.ts` but the Layer is never provided in Bootstrap,
 *   so any Effect that yields this tag fails at the dependency layer
 *   before running the gRPC call. New code MUST route through
 *   `Context.MountainClient?.sendRequest(...)` with the canonical
 *   wire names listed in the module docstring above. Removal scheduled
 *   when the consumer files migrate during Track-B vertical splits.
 */
export const MountainGRPCClientService =
	Context.GenericTag<MountainGRPCClientService>("Service/MountainGRPCClient");

/**
 * Live implementation of MountainGRPCClientService
 * Uses the underlying IMountainClientService for gRPC communication
 */
const MountainGRPCClientLive = Layer.effect(
	MountainGRPCClientService,

	Effect.gen(function* () {
		const mountainClient = yield* IMountainClientService;
		const logger = yield* Logger.Logger;

		const service: MountainGRPCClientService = {
			_serviceBrand: undefined,

			// ==================== Window Operations ====================

			showTextDocument: (uri, options = {}) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] showTextDocument: ${uri}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("showTextDocument", {
								uri: { value: uri },
								viewColumn: options.viewColumn
									? options.viewColumn - 2
									: undefined, // Convert ViewColumn enum (1-based to 0-based)
								preserveFocus: options.preserveFocus ?? true,
							}),
						catch: (error) =>
							new Error(
								`Failed to show text document: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.success) {
						return yield* Effect.fail(
							new Error(`Failed to show text document: ${uri}`),
						);
					}

					return;
				}),

			showInformationMessage: (message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] showInformationMessage: ${message}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("showInformation", {
								message,
							}),
						catch: (error) =>
							new Error(
								`Failed to show information message: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.success) {
						return yield* Effect.fail(
							new Error(
								`Failed to show information message: ${message}`,
							),
						);
					}

					return;
				}),

			showWarningMessage: (message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] showWarningMessage: ${message}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("showWarning", {
								message,
							}),
						catch: (error) =>
							new Error(
								`Failed to show warning message: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.success) {
						return yield* Effect.fail(
							new Error(
								`Failed to show warning message: ${message}`,
							),
						);
					}

					return;
				}),

			showErrorMessage: (message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] showErrorMessage: ${message}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("showError", {
								message,
							}),
						catch: (error) =>
							new Error(
								`Failed to show error message: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.success) {
						return yield* Effect.fail(
							new Error(
								`Failed to show error message: ${message}`,
							),
						);
					}

					return;
				}),

			createStatusBarItem: (options) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] createStatusBarItem: ${options.id}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("createStatusBarItem", {
								id: options.id,
								text: options.text,
								tooltip: options.tooltip ?? "",
							}),
						catch: (error) =>
							new Error(
								`Failed to create status bar item: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.itemId) {
						return yield* Effect.fail(
							new Error(
								`Failed to create status bar item: ${options.id}`,
							),
						);
					}

					return result.itemId;
				}),

			setStatusBarText: (itemId, text) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] setStatusBarText: ${itemId} = ${text}`,
					);

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("setStatusBarText", {
								itemId,
								text,
							}),
						catch: (error) =>
							new Error(
								`Failed to set status bar text: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			createWebviewPanel: (options) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] createWebviewPanel: ${options.viewType}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("createWebviewPanel", {
								viewType: options.viewType,
								title: options.title,
								iconPath: options.iconPath ?? "",
								viewColumn: options.viewColumn
									? options.viewColumn - 2
									: undefined,
								preserveFocus: options.preserveFocus ?? false,
								enableFindWidget:
									options.enableFindWidget ?? true,
								retainContextWhenHidden:
									options.retainContextWhenHidden ?? false,
								localResourceRoots:
									options.localResourceRoots ?? [],
							}),
						catch: (error) =>
							new Error(
								`Failed to create webview panel: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (result?.handle === undefined) {
						return yield* Effect.fail(
							new Error(
								`Failed to create webview panel: ${options.viewType}`,
							),
						);
					}

					return result.handle;
				}),

			setWebviewHtml: (handle, html) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] setWebviewHtml: handle=${handle}`,
					);

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("setWebviewHtml", {
								handle,
								html,
							}),
						catch: (error) =>
							new Error(
								`Failed to set webview HTML: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			postWebviewMessage: (handle, message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] postWebviewMessage: handle=${handle}`,
					);

					const isString = typeof message === "string";

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendNotification(
								"onDidReceiveMessage",

								{
									handle,
									stringMessage: isString
										? message
										: undefined,
									bytesMessage: isString
										? undefined
										: message,
								},
							),
						catch: (error) =>
							new Error(
								`Failed to post webview message: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			// ==================== Workspace Operations ====================

			findFiles: (pattern, include) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] findFiles: ${pattern}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("findFiles", {
								pattern,
								include: include ?? true,
							}),
						catch: (error) =>
							new Error(
								`Failed to find files: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return (result?.uris as string[]) ?? [];
				}),

			findTextInFiles: (pattern, include, exclude) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] findTextInFiles: ${pattern}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("findTextInFiles", {
								pattern,
								include: include ?? [],
								exclude: exclude ?? [],
							}),
						catch: (error) =>
							new Error(
								`Failed to find text in files: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return (result?.matches as any[]) ?? [];
				}),

			openDocument: (uri, viewColumn) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] openDocument: ${uri}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("openDocument", {
								uri: { value: uri },
								viewColumn: viewColumn
									? viewColumn - 2
									: undefined,
							}),
						catch: (error) =>
							new Error(
								`Failed to open document: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.success) {
						return yield* Effect.fail(
							new Error(`Failed to open document: ${uri}`),
						);
					}

					return;
				}),

			saveAll: (includeUntitled = false) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] saveAll: includeUntitled=${includeUntitled}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("saveAll", {
								includeUntitled,
							}),
						catch: (error) =>
							new Error(
								`Failed to save all: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.success) {
						return yield* Effect.fail(
							new Error("Failed to save all documents"),
						);
					}

					return;
				}),

			applyEdit: (uri, edits) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] applyEdit: ${uri}`,
					);

					// Defensive: an extension that builds edits with
					// `new TextEdit(range, text)` ALWAYS produces well-
					// formed positions, but quick-fix code-action
					// providers sometimes serialise edits in odd shapes
					// after revival, leaving `range.start === undefined`.
					// Filter those out + log so we don't `.line` on
					// undefined and crash the entire applyEdit batch.
					const SafeEdits: Array<{
						range: {
							start: { line: number; character: number };
							end: { line: number; character: number };
						};
						newText: string;
					}> = [];
					for (const edit of edits) {
						const Start = edit?.range?.start;
						const End = edit?.range?.end;
						if (
							!Start ||
							!End ||
							typeof Start.line !== "number" ||
							typeof End.line !== "number"
						) {
							continue;
						}
						SafeEdits.push({
							range: {
								// `+ 1` converts vscode.Range (0-based)
								// to the workbench's `IRange` (1-based).
								// Without this, every `workspace.applyEdit`
								// from an extension lands one row too high
								// and one column too far left - rename
								// refactors, quick fixes, snippet inserts
								// all shred the file silently.
								start: {
									line: Start.line + 1,
									character: (Start.character ?? 0) + 1,
								},
								end: {
									line: End.line + 1,
									character: (End.character ?? 0) + 1,
								},
							},
							newText:
								typeof edit.newText === "string"
									? edit.newText
									: "",
						});
					}
					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("applyEdit", {
								uri: { value: uri },
								edits: SafeEdits,
							}),
						catch: (error) =>
							new Error(
								`Failed to apply edit: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.success) {
						return yield* Effect.fail(
							new Error(`Failed to apply edit to: ${uri}`),
						);
					}

					return;
				}),

			// ==================== Command Operations ====================

			registerCommand: (commandId, extensionId, title) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] registerCommand: ${commandId}`,
					);

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendNotification("registerCommand", {
								commandId,
								extensionId,
								title,
							}),
						catch: (error) =>
							new Error(
								`Failed to register command: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			executeCommand: (commandId, ...args) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] executeCommand: ${commandId}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("executeCommand", {
								commandId,
								arguments: args.map((arg) => {
									if (typeof arg === "string") {
										return { stringValue: arg };
									}
									if (typeof arg === "number") {
										return { intValue: arg };
									}
									if (typeof arg === "boolean") {
										return { boolValue: arg };
									}
									if (arg instanceof Uint8Array) {
										return { bytesValue: arg };
									}
									return { stringValue: String(arg) };
								}),
							}),
						catch: (error) =>
							new Error(
								`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					// Check if response contains an error
					if (result?.error) {
						return yield* Effect.fail(
							new Error(
								`Command execution failed: ${result.error.Message}`,
							),
						);
					}

					// Return the result value if present
					return result?.value;
				}),

			unregisterCommand: (commandId) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] unregisterCommand: ${commandId}`,
					);

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendNotification(
								"unregisterCommand",

								{
									commandId,
								},
							),
						catch: (error) =>
							new Error(
								`Failed to unregister command: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			// ==================== Secret Storage ====================

			getSecret: (key) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] getSecret: ${key}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("getSecret", { key }),
						catch: (error) =>
							new Error(
								`Failed to get secret: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return result?.value;
				}),

			storeSecret: (key, value) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] storeSecret: ${key}`,
					);

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendNotification("storeSecret", {
								key,
								value,
							}),
						catch: (error) =>
							new Error(
								`Failed to store secret: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			deleteSecret: (key) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] deleteSecret: ${key}`,
					);

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendNotification("deleteSecret", {
								key,
							}),
						catch: (error) =>
							new Error(
								`Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			// ==================== File System Operations ====================

			readFile: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] readFile: ${uri}`,
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("readFile", {
								uri: { value: uri },
							}),
						catch: (error) =>
							new Error(
								`Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result?.content) {
						return yield* Effect.fail(
							new Error(`Failed to read file: ${uri}`),
						);
					}

					return result.content as Uint8Array;
				}),

			writeFile: (uri, content, encoding = "utf8") =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClient] writeFile: ${uri}`,
					);

					yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendNotification("writeFile", {
								uri: { value: uri },
								content,
								encoding,
							}),
						catch: (error) =>
							new Error(
								`Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return;
				}),

			stat: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(`[MountainGRPCClient] stat: ${uri}`);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("stat", {
								uri: { value: uri },
							}),
						catch: (error) =>
							new Error(
								`Failed to stat file: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					if (!result) {
						return yield* Effect.fail(
							new Error(`Failed to stat file: ${uri}`),
						);
					}

					return result;
				}),

			readdir: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(`[MountainGRPCClient] readdir: ${uri}`);

					const result = yield* Effect.tryPromise({
						try: () =>
							mountainClient.sendRequest("readdir", {
								uri: { value: uri },
							}),
						catch: (error) =>
							new Error(
								`Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
							),
					});

					return (result?.entries as string[]) ?? [];
				}),
		};

		return service;
	}),
);

/**
 * Mock implementation for testing
 * Provides in-memory implementations of all operations
 */
const MountainGRPCClientMock = Layer.effect(
	MountainGRPCClientService,

	Effect.gen(function* () {
		const logger = yield* Logger.Logger;

		// In-memory storage for mock data
		const mockSecrets = new Map<string, string>();
		const mockStatusBarItems = new Map<string, string>();
		const mockWebviewPanels = new Map<number, { html: string }>();
		let mockWebviewHandleCounter = 0;

		const service: MountainGRPCClientService = {
			_serviceBrand: undefined,

			// Window Operations
			showTextDocument: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] showTextDocument: ${uri}`,
					);
					return;
				}),

			showInformationMessage: (message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] showInformationMessage: ${message}`,
					);
					return;
				}),

			showWarningMessage: (message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] showWarningMessage: ${message}`,
					);
					return;
				}),

			showErrorMessage: (message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] showErrorMessage: ${message}`,
					);
					return;
				}),

			createStatusBarItem: (options) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] createStatusBarItem: ${options.id}`,
					);
					const itemId = `status-${options.id}`;
					mockStatusBarItems.set(itemId, options.text);
					return itemId;
				}),

			setStatusBarText: (itemId, text) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] setStatusBarText: ${itemId}`,
					);
					mockStatusBarItems.set(itemId, text);
					return;
				}),

			createWebviewPanel: (options) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] createWebviewPanel: ${options.viewType}`,
					);
					const handle = mockWebviewHandleCounter++;
					mockWebviewPanels.set(handle, { html: options.html ?? "" });
					return handle;
				}),

			setWebviewHtml: (handle, html) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] setWebviewHtml: ${handle}`,
					);
					const panel = mockWebviewPanels.get(handle);
					if (panel) {
						panel.html = html;
					}
					return;
				}),

			postWebviewMessage: (handle, message) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] postWebviewMessage: ${handle}`,
					);
					return;
				}),

			// Workspace Operations
			findFiles: (pattern) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] findFiles: ${pattern}`,
					);
					return []; // Return empty array for mock
				}),

			findTextInFiles: (pattern) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] findTextInFiles: ${pattern}`,
					);
					return []; // Return empty array for mock
				}),

			openDocument: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] openDocument: ${uri}`,
					);
					return;
				}),

			saveAll: () =>
				Effect.gen(function* () {
					yield* logger.debug("[MountainGRPCClientMock] saveAll");
					return;
				}),

			applyEdit: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] applyEdit: ${uri}`,
					);
					return;
				}),

			// Command Operations
			registerCommand: (commandId) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] registerCommand: ${commandId}`,
					);
					return;
				}),

			executeCommand: (commandId) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] executeCommand: ${commandId}`,
					);
					return undefined;
				}),

			unregisterCommand: (commandId) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] unregisterCommand: ${commandId}`,
					);
					return;
				}),

			// Secret Storage
			getSecret: (key) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] getSecret: ${key}`,
					);
					return mockSecrets.get(key);
				}),

			storeSecret: (key, value) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] storeSecret: ${key}`,
					);
					mockSecrets.set(key, value);
					return;
				}),

			deleteSecret: (key) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] deleteSecret: ${key}`,
					);
					mockSecrets.delete(key);
					return;
				}),

			// File System Operations
			readFile: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] readFile: ${uri}`,
					);
					return new Uint8Array(0);
				}),

			writeFile: (uri, content) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] writeFile: ${uri}`,
					);
					return;
				}),

			stat: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] stat: ${uri}`,
					);
					return {
						isFile: true,
						isDirectory: false,
						size: 0,
						mtime: Date.now(),
					};
				}),

			readdir: (uri) =>
				Effect.gen(function* () {
					yield* logger.debug(
						`[MountainGRPCClientMock] readdir: ${uri}`,
					);
					return [];
				}),
		};

		return service;
	}),
);

/**
 * Export layers.
 *
 * @deprecated 2026-05-26 - `MountainGRPCClientLayer` is never imported by
 *   `Bootstrap.ts` or any other entry point. The Effect Layer is dead.
 *   See the module docstring at the top of this file for the migration
 *   path and the canonical wire-method names. Marked but not yet removed
 *   so a search-and-rescue grep can still find historical usages while
 *   the consumer files are migrated.
 */
export const MountainGRPCClientLayer = MountainGRPCClientLive.pipe(
	Layer.provide(IMountainClientService as any),
);

/**
 * @deprecated 2026-05-26 - see `MountainGRPCClientLayer`. Mock layer is
 *   unused in the test suite (no consumer provides it). Retained pending
 *   migration cleanup.
 */
export const MountainGRPCClientMockLayer = MountainGRPCClientMock;
