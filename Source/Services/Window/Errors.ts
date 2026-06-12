/**
 * @module Services/Window/Errors
 * @description
 * Error types for Window service operations.
 * Following Wind Effect-TS atomic module pattern.
 */

/**
 * Error when window operation fails
 */
export class WindowOperationError extends Error {
	readonly _tag = "WindowOperationError";

	readonly operation: string;

	readonly cause: unknown;

	constructor(operation: string, cause: unknown) {
		super(`Window operation '${operation}' failed: ${String(cause)}`;

		this.operation = operation;

		this.cause = cause;

		Object.setPrototypeOf(this, WindowOperationError.prototype;
	}

	override get name() {
		return "WindowOperationError";
	}
}

/**
 * Error when dialog operation fails
 */
export class DialogError extends Error {
	readonly _tag = "DialogError";

	readonly dialogType: string;

	readonly cause: unknown;

	constructor(dialogType: string, cause: unknown) {
		super(`Dialog operation '${dialogType}' failed: ${String(cause)}`;

		this.dialogType = dialogType;

		this.cause = cause;

		Object.setPrototypeOf(this, DialogError.prototype;
	}

	override get name() {
		return "DialogError";
	}
}

/**
 * Error when quick input operation fails
 */
export class QuickInputError extends Error {
	readonly _tag = "QuickInputError";

	readonly inputType: string;

	readonly cause: unknown;

	constructor(inputType: string, cause: unknown) {
		super(`Quick input operation '${inputType}' failed: ${String(cause)}`;

		this.inputType = inputType;

		this.cause = cause;

		Object.setPrototypeOf(this, QuickInputError.prototype;
	}

	override get name() {
		return "QuickInputError";
	}
}

/**
 * Error when status bar operation fails
 */
export class StatusBarError extends Error {
	readonly _tag = "StatusBarError";

	readonly itemId: string;

	readonly operation: string;

	readonly cause: unknown;

	constructor(itemId: string, operation: string, cause: unknown) {
		super(
			`StatusBar '${itemId}' operation '${operation}' failed: ${String(cause)}`,
		;

		this.itemId = itemId;

		this.operation = operation;

		this.cause = cause;

		Object.setPrototypeOf(this, StatusBarError.prototype;
	}

	override get name() {
		return "StatusBarError";
	}
}

/**
 * Error when output channel operation fails
 */
export class OutputChannelError extends Error {
	readonly _tag = "OutputChannelError";

	readonly channelName: string;

	readonly operation: string;

	readonly cause: unknown;

	constructor(channelName: string, operation: string, cause: unknown) {
		super(
			`OutputChannel '${channelName}' operation '${operation}' failed: ${String(cause)}`,
		;

		this.channelName = channelName;

		this.operation = operation;

		this.cause = cause;

		Object.setPrototypeOf(this, OutputChannelError.prototype;
	}

	override get name() {
		return "OutputChannelError";
	}
}

/**
 * Error when webview panel operation fails
 */
export class WebviewPanelError extends Error {
	readonly _tag = "WebviewPanelError";

	readonly viewType: string;

	readonly operation: string;

	readonly cause: unknown;

	constructor(viewType: string, operation: string, cause: unknown) {
		super(
			`WebviewPanel '${viewType}' operation '${operation}' failed: ${String(cause)}`,
		;

		this.viewType = viewType;

		this.operation = operation;

		this.cause = cause;

		Object.setPrototypeOf(this, WebviewPanelError.prototype;
	}

	override get name() {
		return "WebviewPanelError";
	}
}

/**
 * Error when progress operation fails
 */
export class ProgressError extends Error {
	readonly _tag = "ProgressError";

	readonly operation: string;

	readonly cause: unknown;

	constructor(operation: string, cause: unknown) {
		super(`Progress operation '${operation}' failed: ${String(cause)}`;

		this.operation = operation;

		this.cause = cause;

		Object.setPrototypeOf(this, ProgressError.prototype;
	}

	override get name() {
		return "ProgressError";
	}
}

/**
 * Error when text document operation fails
 */
export class TextDocumentError extends Error {
	readonly _tag = "TextDocumentError";

	readonly documentUri: string;

	readonly operation: string;

	readonly cause: unknown;

	constructor(documentUri: string, operation: string, cause: unknown) {
		super(
			`TextDocument '${documentUri}' operation '${operation}' failed: ${String(cause)}`,
		;

		this.documentUri = documentUri;

		this.operation = operation;

		this.cause = cause;

		Object.setPrototypeOf(this, TextDocumentError.prototype;
	}

	override get name() {
		return "TextDocumentError";
	}
}
