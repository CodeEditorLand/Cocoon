/**
 * @module Services/Mountain/gRPC/Types
 *
 * DTO and interface definitions for the Mountain gRPC client service.
 * Isolated so consumers can `import type` without pulling in the Effect
 * layer or live implementation.
 */

import type { Effect } from "effect";

// ── Request option shapes ──────────────────────────────────────────────────

/** Options for `showTextDocument`. */
export interface ShowTextDocumentOptions {
	uri: string;

	viewColumn?: number;

	preserveFocus?: boolean;

	preview?: boolean;

	selection?: { line: number; character: number };
}

/** Configuration for `createStatusBarItem`. */
export interface StatusBarItemOptions {
	id: string;

	text: string;

	tooltip?: string;
}

/** Configuration for `createWebviewPanel`. */
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

/** Single text edit applied to a document. */
export interface TextEdit {
	range: {
		start: { line: number; character: number };

		end: { line: number; character: number };
	};

	newText: string;
}

// ── Service interface ──────────────────────────────────────────────────────

/**
 * Effect-TS service interface for Mountain Vine protocol operations.
 * Covers Window, Workspace, Command, Secret Storage, and File System domains.
 */
export interface IMountainGRPCClientService {
	readonly _serviceBrand: undefined;

	// Window
	showTextDocument(
		uri: string,

		options?: Partial<ShowTextDocumentOptions>,
	): Effect.Effect<void, Error>;

	showInformationMessage(message: string): Effect.Effect<void, Error>;

	showWarningMessage(message: string): Effect.Effect<void, Error>;

	showErrorMessage(message: string): Effect.Effect<void, Error>;

	createStatusBarItem(
		options: StatusBarItemOptions,
	): Effect.Effect<string, Error>;

	setStatusBarText(itemId: string, text: string): Effect.Effect<void, Error>;

	createWebviewPanel(
		options: WebviewPanelOptions,
	): Effect.Effect<number, Error>;

	setWebviewHtml(handle: number, html: string): Effect.Effect<void, Error>;

	postWebviewMessage(
		handle: number,

		message: string | Uint8Array,
	): Effect.Effect<void, Error>;

	// Workspace
	findFiles(
		pattern: string,

		include?: string[],
	): Effect.Effect<string[], Error>;

	findTextInFiles(
		pattern: string,

		include?: string[],

		exclude?: string[],
	): Effect.Effect<any[], Error>;

	openDocument(uri: string, viewColumn?: number): Effect.Effect<void, Error>;

	saveAll(includeUntitled?: boolean): Effect.Effect<void, Error>;

	applyEdit(uri: string, edits: TextEdit[]): Effect.Effect<void, Error>;

	// Commands
	registerCommand(
		commandId: string,

		extensionId: string,

		title: string,
	): Effect.Effect<void, Error>;

	executeCommand(
		commandId: string,
		...args: any[]
	): Effect.Effect<any, Error>;

	unregisterCommand(commandId: string): Effect.Effect<void, Error>;

	// Secret Storage
	getSecret(key: string): Effect.Effect<string | undefined, Error>;

	storeSecret(key: string, value: string): Effect.Effect<void, Error>;

	deleteSecret(key: string): Effect.Effect<void, Error>;

	// File System
	readFile(uri: string): Effect.Effect<Uint8Array, Error>;

	writeFile(
		uri: string,

		content: Uint8Array,

		encoding?: string,
	): Effect.Effect<void, Error>;

	stat(uri: string): Effect.Effect<any, Error>;

	readdir(uri: string): Effect.Effect<string[], Error>;
}
