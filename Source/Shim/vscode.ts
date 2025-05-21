// Basic JS shim mirroring the TS one for Cocoon's use
// This file acts as a rudimentary vscode namespace provider.
// In a full shim, it would re-export shims for commands, window, workspace, languages, etc.

// --- Define some basic vscode API types that might be used by these stubs ---
// These would normally come from a full vscode.d.ts or your shimmed equivalent.

export interface Disposable {
	dispose(): void;
}

export interface StatusBarItem {
	show(): void;

	hide(): void;

	text: string;

	// Or MarkdownString
	tooltip: string | undefined;

	// Or Command
	command: string | undefined;

	dispose(): void;

	// Add other properties like id, alignment, priority, color, name, accessibilityInformation
}

// --- window namespace ---
namespace window {
	// Using namespace to group window members
	export async function showInformationMessage(
		message: string,

		...items: string[]
	): Promise<string | undefined>;

	export async function showInformationMessage<T extends MessageItem>(
		message: string,

		...items: T[]
	): Promise<T | undefined>;

	export async function showInformationMessage(
		message: string,

		options: MessageOptions,

		...items: string[]
	): Promise<string | undefined>;

	export async function showInformationMessage<T extends MessageItem>(
		message: string,

		options: MessageOptions,

		...items: T[]
	): Promise<T | undefined>;

	export async function showInformationMessage(
		message: string,

		...args: any[]
	): Promise<any | undefined> {
		console.log(
			`[Cocoon Shim] Simulating vscode.window.showInformationMessage: "${message}"`,

			args,
		);

		// In a real shim, this might communicate back to Mountain via Vine/IPC
		// to request the actual UI display and handle item selection.
		// Or selected item if options given
		return Promise.resolve(undefined);
	}

	export function createStatusBarItem(
		// Newer API might have id
		// id?: string,

		alignment?: /* StatusBarAlignment */ number,

		priority?: number,
	): StatusBarItem {
		console.log(
			`[Cocoon Shim] Simulating vscode.window.createStatusBarItem (alignment: ${alignment}, priority: ${priority})`,
		);

		let _text = "";

		let _tooltip: string | undefined = "";

		let _command: string | undefined = "";

		return {
			// Return a mock object implementing StatusBarItem
			show: () =>
				console.log(
					`[Cocoon Shim] Mock StatusBarItem.show() for text: "${_text}"`,
				),

			hide: () => console.log(`[Cocoon Shim] Mock StatusBarItem.hide()`),

			get text() {
				return _text;
			},

			set text(value: string) {
				_text = value;

				console.log(
					`[Cocoon Shim] Mock StatusBarItem.text set to "${value}"`,
				);
			},

			get tooltip() {
				return _tooltip;
			},

			set tooltip(value: string | undefined) {
				_tooltip = value;
			},

			get command() {
				return _command;
			},

			set command(value: string | undefined) {
				_command = value;
			},

			dispose: () =>
				console.log(`[Cocoon Shim] Mock StatusBarItem.dispose()`),
		};
	}

	// Add other vscode.window members as needed by extensions:
	// export const activeTextEditor: TextEditor | undefined = undefined;

	// export const visibleTextEditors: readonly TextEditor[] = [];

	// export function createOutputChannel(name: string): OutputChannel { /* ... */ }

	// ... and many more
}

// --- commands namespace ---
namespace commands {
	// Using namespace to group commands members
	export function registerCommand(
		commandId: string,

		handler: (...args: any[]) => any,
	): Disposable {
		console.log(
			`[Cocoon Shim] Simulating vscode.commands.registerCommand: "${commandId}"`,
		);

		// TODO: In a real shim, this would delegate to ShimExtHostCommands.registerCommand
		// which stores the handler and potentially notifies Mountain/Track.
		return {
			dispose: () => {
				console.log(
					`[Cocoon Shim] Mock Disposable.dispose() for command "${commandId}"`,
				);
			},
		};
	}

	export async function executeCommand<T = unknown>(
		command: string,

		...rest: any[]
	): Promise<T | undefined> {
		console.log(
			`[Cocoon Shim] Simulating vscode.commands.executeCommand: "${command}" with args`,

			rest,
		);

		// TODO: In a real shim, this would delegate to ShimExtHostCommands.executeCommand
		return Promise.resolve(undefined as T | undefined);
	}

	// export async function getCommands(filterInternal?: boolean): Promise<string[]> { /* ... */ }
}

// --- Other top-level vscode namespaces and members ---
// namespace workspace { /* ... */ }

// namespace languages { /* ... */ }

// Should be imported from a Uri shim or the actual class
// export const Uri = ... ;

// export const Position = ...;

// export const Range = ...;

// ... etc. for all core vscode types and enums

// --- Exporting the namespaces to mimic the 'vscode' module structure ---
// This is how an extension would typically use it: import * as vscode from 'vscode';

// or const vscode = require('vscode');

// Re-exporting for module structure
export {
	window,
	commands,

	// workspace, languages, Uri, Position, Range, etc.
};

// For `const vscode = require('vscode');` compatibility, also do a default export.
// However, ES module best practice is named exports or a single default object.
// If this file is the *entry point* for the 'vscode' module shim,

// a default export containing all namespaces might be what the bundler/loader expects.

const vscodeAPI = {
	window,

	commands,

	// workspace,

	// languages,

	// These should be classes/constructors
	// Uri, Position, Range,

	// ... other top-level exports
};

// If this file itself is treated as the 'vscode' module by the loader:
export default vscodeAPI;

// Helper types (usually from vscode.d.ts)
export interface MessageItem {
	title: string;

	isCloseAffordance?: boolean;

	// Allow other properties if extensions add them
	[key: string]: any;
}

export interface MessageOptions {
	modal?: boolean;

	detail?: string;

	[key: string]: any;
}
