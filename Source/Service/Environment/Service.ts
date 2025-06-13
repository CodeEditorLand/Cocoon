/**
 * @module Service (Environment)
 * @description Defines the interface and Context.Tag for the Environment service,
 * which implements the `vscode.env` API.
 */

import { Context } from "effect";
import type { Clipboard, Event, LogLevel, UIKind, Uri } from "vscode";

/**
 * The service interface for the `vscode.env` API.
 * `Event` properties are used here for direct vscode API compatibility.
 */
export interface Interface {
	readonly appName: string;
	readonly appRoot?: string;
	readonly appHost: string;
	readonly uriScheme: string;
	readonly language: string;
	readonly machineId: string;
	readonly sessionId: string;
	readonly isTrusted: boolean;
	readonly isRemote: boolean;
	readonly remoteName?: string;
	readonly shell: string;
	readonly uiKind: UIKind;
	readonly isNewAppInstall: boolean;
	readonly isBuilt: boolean;
	readonly logLevel: LogLevel;
	readonly onDidChangeLogLevel: Event<LogLevel>;
	readonly isTelemetryEnabled: boolean;
	readonly onDidChangeTelemetryEnabled: Event<boolean>;
	readonly onDidChangeShell: Event<string>;
	readonly clipboard: Clipboard;
	readonly openExternal: (target: Uri) => Promise<boolean>;
	readonly asExternalUri: (target: Uri) => Promise<Uri>;
}

export const Tag = Context.Tag<Interface>("Service/Environment");
