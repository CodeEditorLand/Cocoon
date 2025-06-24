/*
 * File: Cocoon/Source/Service/Environment/Service.ts
 * Role: Defines the service interface and Effect.Service for the Environment service.
 * Responsibilities:
 *   - Declare the contract for the service that implements the `vscode.env` API.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { Clipboard, Event, LogLevel, UIKind, Uri } from "vscode";

/**
 * The `Effect.Service` for the `vscode.env` API service.
 *
 * This service provides information about the application's environment, such as
 * the application name, UI kind, and session identifiers. It also provides
 * access to the system clipboard and methods for interacting with external URLs.
 */
export class Environment extends Effect.Service<Environment>(
	"Service/Environment",
)<{
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
	readonly openExternal: (Target: Uri) => Promise<boolean>;
	readonly asExternalUri: (Target: Uri) => Promise<Uri>;
}>() {}
