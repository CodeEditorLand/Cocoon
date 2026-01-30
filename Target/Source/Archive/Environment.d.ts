/**
 * @module Environment
 * @description Defines the service that implements the `vscode.env` API.
 * This service provides information about the application's environment, such as
 * the application name, UI kind, and session identifiers. It also provides
 * access to the system clipboard and methods for interacting with external URLs.
 */
import { Effect } from "effect";
import { UIKind, type Clipboard, type Event, type LogLevel, type Uri } from "vscode";
import { ClipboardService } from "./Clipboard.js";
import { IPCService } from "./IPC.js";
/**
 * @interface Environment
 * @description The contract for the Environment service, matching `vscode.env`.
 */
export interface Environment {
    readonly appName: string;
    readonly appRoot?: string | undefined;
    readonly appHost: string;
    readonly uriScheme: string;
    readonly language: string;
    readonly machineId: string;
    readonly sessionId: string;
    readonly isTrusted: boolean;
    readonly isRemote: boolean;
    readonly remoteName?: string | undefined;
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
}
declare const EnvironmentService_base: Effect.Service.Class<EnvironmentService, "Service/Environment", {
    readonly effect: Effect.Effect<Environment, never, IPCService | import("@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js").IExtensionHostInitData | ClipboardService>;
}>;
/**
 * @class Environment
 * @description The `Effect.Service` for the `vscode.env` API service.
 */
export declare class EnvironmentService extends EnvironmentService_base {
}
export {};
//# sourceMappingURL=Environment.d.ts.map