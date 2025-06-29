/**
 * @module Environment
 * @description Defines the service that implements the `vscode.env` API.
 * This service provides information about the application's environment, such as
 * the application name, UI kind, and session identifiers. It also provides
 * access to the system clipboard and methods for interacting with external URLs.
 */

import { Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import {
	UIKind,
	type Clipboard,
	type Event,
	type LogLevel,
	type Uri,
} from "vscode";

import { ClipboardService } from "./Clipboard.js";
import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { ToAPI as UriToApi } from "./TypeConverter/Main/URI.js";
import { CreateEventStream } from "./Utility/EventStream.js";

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

/**
 * @class Environment
 * @description The `Effect.Service` for the `vscode.env` API service.
 */
export class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{
		effect: Effect.gen(function* () {
			const InitData = yield* InitDataService;
			const IPC = yield* IPCService;
			const Clipboard = yield* ClipboardService;

			const LogLevelRef = yield* Ref.make(
				InitData.logLevel as number as LogLevel,
			);
			const { event: OnDidChangeLogLevel, Fire: FireLogLevel } =
				CreateEventStream<LogLevel>();
			const { event: OnDidChangeShell } = CreateEventStream<string>();
			const { event: OnDidChangeTelemetryEnabled } =
				CreateEventStream<boolean>();

			IPC.RegisterInvokeHandler("$onDidChangeLogLevel", ([Level]) =>
				Effect.runPromise(FireLogLevel(Level)),
			);

			const OpenExternal = (Target: Uri) =>
				IPC.SendRequest<boolean>("$openUri", [
					Target.toJSON(),
					{ allowExternalSchemes: true },
				]).pipe(Effect.map((Result) => !!Result));

			const AsExternalUri = (Target: Uri) =>
				IPC.SendRequest<any>("$asExternalUri", [Target.toJSON()]).pipe(
					Effect.map((Dto) => UriToApi(Dto)),
				);

			const GetAppRoot = () => {
				const AppRootUri = InitData.environment.appRoot;
				return AppRootUri?.scheme === Schemas.file
					? AppRootUri.fsPath
					: undefined;
			};

			const TelemetryLevelValue =
				InitData.logLevel ?? TelemetryLevel.NONE;
			const IsTrusted = InitData.workspace
				? ((InitData.workspace as any).isTrusted ?? true)
				: true;

			const ServiceImplementation: Environment = {
				appName: InitData.environment.appName || "Cocoon Editor",
				appRoot: GetAppRoot(),
				appHost: InitData.environment.appHost || "desktop",
				uriScheme: InitData.environment.appUriScheme || "cocoon-code",
				language: InitData.environment.appLanguage || "en",
				machineId: InitData.telemetryInfo.machineId,
				sessionId: InitData.telemetryInfo.sessionId,
				isTrusted: IsTrusted,
				isRemote: !!InitData.remote?.isRemote,
				remoteName: InitData.remote?.authority?.split("+")[0],
				shell:
					process.platform === "win32"
						? process.env["ComSpec"] || "pwsh.exe"
						: process.env["SHELL"] || "/bin/sh",
				uiKind: InitData.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
				isNewAppInstall:
					Date.now() -
						new Date(
							InitData.telemetryInfo.firstSessionDate,
						).getTime() <
					1000 * 60 * 60 * 24,
				isBuilt: InitData.quality !== "development",
				get logLevel() {
					return Effect.runSync(Ref.get(LogLevelRef));
				},
				get isTelemetryEnabled() {
					return TelemetryLevelValue >= TelemetryLevel.USAGE;
				},
				onDidChangeLogLevel: OnDidChangeLogLevel,
				onDidChangeShell: OnDidChangeShell,
				onDidChangeTelemetryEnabled: OnDidChangeTelemetryEnabled,
				clipboard: Clipboard as unknown as Clipboard,
				openExternal: (Target) =>
					Effect.runPromise(OpenExternal(Target)),
				asExternalUri: (Target) =>
					Effect.runPromise(AsExternalUri(Target)),
			};

			return ServiceImplementation;
		}),
	},
) {}
