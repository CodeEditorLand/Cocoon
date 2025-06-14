/**
 * @module Definition (Environment)
 * @description The live implementation of the Environment service.
 */

import { Context, Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import type { LogLevel, UIKind, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import ClipboardServiceTag from "../Clipboard/Service.js";
import InitDataServiceTag from "../InitData/Service.js";
import IPCServiceTag from "../IPC/Service.js";
import type EnvironmentService from "./Service.js";

// Assuming this is a const enum or similar construct from VS Code's sources
const TelemetryLevel = {
	NONE: 0,
	OFF: 0,
	ERROR: 1,
	USAGE: 2,
};

export default Effect.gen(function* (Yield) {
	const InitData = yield* Yield(InitDataServiceTag);
	const Ipc = yield* Yield(IPCServiceTag);
	const Clipboard = yield* Yield(ClipboardServiceTag);

	// --- State and Events ---
	const LogLevelRef = yield* Yield(
		Ref.make(InitData.logLevel as number as LogLevel),
	);
	const OnDidChangeLogLevelEvent = CreateEventStream<LogLevel>();
	const OnDidChangeShellEvent = CreateEventStream<string>();
	const OnDidChangeTelemetryEvent = CreateEventStream<boolean>();

	// --- RPC Handlers ---
	// The IPC service should have a way to listen to incoming messages.
	// We register a handler that fires the log level change event.
	yield* Ipc.RegisterInvokeHandler("$onDidChangeLogLevel", ([Level]) =>
		OnDidChangeLogLevelEvent.Fire(Level),
	);
	// A handler for telemetry changes would also be registered here.

	// --- Effects for Methods ---
	const CreateOpenExternalEffect = (Target: Uri) =>
		Ipc.SendRequest<boolean>("$openUri", [
			TypeConverter.default.URI.FromAPI(Target),
			{ allowExternalSchemes: true },
		]).pipe(Effect.map((Result) => !!Result));

	const CreateAsExternalURIEffect = (Target: Uri) =>
		Ipc.SendRequest<any>("$asExternalUri", [
			TypeConverter.default.URI.FromAPI(Target),
		]).pipe(Effect.map((Dto) => TypeConverter.default.URI.ToAPI(Dto)));

	const GetAppRoot = () => {
		const AppRootUri = InitData.environment.appRoot as any; // Cast from internal type
		return AppRootUri?.scheme === Schemas.file
			? AppRootUri.fsPath
			: undefined;
	};

	const TelemetryLevelValue =
		InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;

	const ServiceImplementation: Context.Tag.Service<
		typeof EnvironmentService
	> = {
		appName: InitData.environment.appName || "Cocoon Editor",
		appRoot: GetAppRoot(),
		appHost: InitData.environment.appHost || "desktop",
		uriScheme: InitData.environment.appUriScheme || "cocoon-code",
		language: InitData.environment.appLanguage || "en",
		machineId: InitData.telemetryInfo.machineId,
		sessionId: InitData.telemetryInfo.sessionId,
		isTrusted: InitData.workspace?.isTrusted ?? true,
		isRemote: !!InitData.remote?.isRemote,
		remoteName: InitData.remote?.authority?.split("+")[0],
		shell:
			process.platform === "win32"
				? process.env["ComSpec"] || "pwsh.exe"
				: process.env["SHELL"] || "/bin/sh",
		uiKind: InitData.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
		isNewAppInstall: (InitData as any).isNewAppInstall === true,
		isBuilt: InitData.quality !== "development",
		get logLevel() {
			return Ref.get(LogLevelRef);
		},
		get isTelemetryEnabled() {
			return TelemetryLevelValue !== TelemetryLevel.NONE;
		},

		// Events
		onDidChangeLogLevel: OnDidChangeLogLevelEvent.Stream,
		onDidChangeShell: OnDidChangeShellEvent.Stream,
		onDidChangeTelemetryEnabled: OnDidChangeTelemetryEvent.Stream,

		// Injected Services/Objects
		clipboard: Clipboard,
		openExternal: (Target) => CreateOpenExternalEffect(Target),
		asExternalUri: (Target) => CreateAsExternalURIEffect(Target),
	};

	return ServiceImplementation;
});
