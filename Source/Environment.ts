/**
 * @module Environment
 * @description Defines the service that implements the `vscode.env` API.
 * This service provides information about the application's environment, such as
 * the application name, UI kind, and session identifiers. It also provides
 * access to the system clipboard and methods for interacting with external URLs.
 */

import { Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import {
	UIKind,
	type Clipboard,
	type Event,
	type LogLevel,
	type Uri,
} from "vscode";
import { ToApi as UriToApi } from "./TypeConverter/Main/Uri.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { Clipboard as ClipboardService } from "./Clipboard.js";
import { InitData } from "./InitData.js";
import { IPC } from "./IPC.js";

// This is defined in `vs/platform/telemetry/common/telemetry.js`.
const TelemetryLevel = { NONE: 0, CRASH: 1, ERROR: 2, USAGE: 3 };

/**
 * @interface Environment
 * @description The contract for the Environment service, matching `vscode.env`.
 */
export interface Environment {
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
}

/**
 * @class Environment
 * @description The `Effect.Service` for the `vscode.env` API service.
 */
export class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{
		effect: Effect.gen(function* () {
			const InitDataService = yield* InitData;
			const IPCService = yield* IPC;
			const Clipboard = yield* ClipboardService;

			const LogLevelRef = yield* Ref.make(
				InitDataService.logLevel as number as LogLevel,
			);
			const { event: OnDidChangeLogLevel, Fire: FireLogLevel } =
				CreateEventStream<LogLevel>();
			const { event: OnDidChangeShell } = CreateEventStream<string>();
			const { event: OnDidChangeTelemetryEnabled } =
				CreateEventStream<boolean>();

			IPCService.RegisterInvokeHandler(
				"$onDidChangeLogLevel",
				([Level]) => Effect.runPromise(FireLogLevel(Level)),
			);

			const OpenExternal = (Target: Uri) =>
				IPCService.SendRequest<boolean>("$openUri", [
					Target.toJSON(),
					{ allowExternalSchemes: true },
				]).pipe(Effect.map((Result) => !!Result));

			const AsExternalUri = (Target: Uri) =>
				IPCService.SendRequest<any>("$asExternalUri", [
					Target.toJSON(),
				]).pipe(Effect.map((Dto) => UriToApi(Dto)));

			const GetAppRoot = () => {
				const AppRootUri = InitDataService.environment.appRoot;
				return AppRootUri?.scheme === Schemas.file
					? AppRootUri.fsPath
					: undefined;
			};

			const TelemetryLevelValue =
				InitDataService.logLevel ?? TelemetryLevel.NONE;
			const IsTrusted = InitDataService.workspace
				? ((InitDataService.workspace as any).isTrusted ?? true)
				: true;

			const ServiceImplementation: Environment = {
				appName: InitDataService.environment.appName || "Cocoon Editor",
				appRoot: GetAppRoot(),
				appHost: InitDataService.environment.appHost || "desktop",
				uriScheme:
					InitDataService.environment.appUriScheme || "cocoon-code",
				language: InitDataService.environment.appLanguage || "en",
				machineId: InitDataService.telemetryInfo.machineId,
				sessionId: InitDataService.telemetryInfo.sessionId,
				isTrusted: IsTrusted,
				isRemote: !!InitDataService.remote?.isRemote,
				remoteName: InitDataService.remote?.authority?.split("+")[0],
				shell:
					process.platform === "win32"
						? process.env["ComSpec"] || "pwsh.exe"
						: process.env["SHELL"] || "/bin/sh",
				uiKind:
					InitDataService.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
				isNewAppInstall:
					Date.now() -
						new Date(
							InitDataService.telemetryInfo.firstSessionDate,
						).getTime() <
					1000 * 60 * 60 * 24,
				isBuilt: InitDataService.quality !== "development",
				get logLevel() {
					return Effect.runSync(Ref.get(LogLevelRef));
				},
				get isTelemetryEnabled() {
					return TelemetryLevelValue >= TelemetryLevel.USAGE;
				},
				onDidChangeLogLevel,
				onDidChangeShell,
				onDidChangeTelemetryEnabled,
				clipboard: Clipboard,
				openExternal: (Target) =>
					Effect.runPromise(OpenExternal(Target)),
				asExternalUri: (Target) =>
					Effect.runPromise(AsExternalUri(Target)),
			};

			return ServiceImplementation;
		}),
	},
) {}
