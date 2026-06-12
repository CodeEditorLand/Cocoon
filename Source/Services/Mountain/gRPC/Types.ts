/**
 * @module Services/Mountain/gRPC/Types
 *
 * DTO and interface definitions for the Mountain gRPC client service.
 * Isolated so consumers can `import type` without pulling in live implementation.
 */

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
 * Service interface for Mountain Vine protocol operations.
 * Covers Window, Workspace, Command, Secret Storage, and File System domains.
 */
export interface IMountainGRPCClientService {
	readonly _serviceBrand: undefined;

	// Window
	showTextDocument(
		uri: string,

		options?: Partial<ShowTextDocumentOptions>,
	): Promise<void>;

	showInformationMessage(message: string): Promise<void>;

	showWarningMessage(message: string): Promise<void>;

	showErrorMessage(message: string): Promise<void>;

	createStatusBarItem(options: StatusBarItemOptions): Promise<string>;

	setStatusBarText(itemId: string, text: string): Promise<void>;

	createWebviewPanel(options: WebviewPanelOptions): Promise<number>;

	setWebviewHtml(handle: number, html: string): Promise<void>;

	postWebviewMessage(
		handle: number,

		message: string | Uint8Array,
	): Promise<void>;

	// Workspace
	findFiles(
		pattern: string,

		include?: string[],
	): Promise<string[]>;

	findTextInFiles(
		pattern: string,

		include?: string[],

		exclude?: string[],
	): Promise<any[]>;

	openDocument(uri: string, viewColumn?: number): Promise<void>;

	saveAll(includeUntitled?: boolean): Promise<void>;

	applyEdit(uri: string, edits: TextEdit[]): Promise<void>;

	// Commands
	registerCommand(
		commandId: string,

		extensionId: string,

		title: string,
	): Promise<void>;

	executeCommand(commandId: string, ...args: any[]): Promise<any>;

	unregisterCommand(commandId: string): Promise<void>;

	// Secret Storage
	getSecret(key: string): Promise<string | undefined>;

	storeSecret(key: string, value: string): Promise<void>;

	deleteSecret(key: string): Promise<void>;

	// File System
	readFile(uri: string): Promise<Uint8Array>;

	writeFile(
		uri: string,

		content: Uint8Array,

		encoding?: string,
	): Promise<void>;

	stat(uri: string): Promise<any>;

	readdir(uri: string): Promise<string[]>;
}
