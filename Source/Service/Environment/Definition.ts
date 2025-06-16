/**
 * @module Definition (Environment)
 * @description The live implementation of the Environment service.
 */

import { Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { UIKind, type LogLevel, type Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import ClipboardService from "../Clipboard/Service.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

// Assuming this is a const enum or similar construct from VS Code's sources
const TelemetryLevel = {
	NONE: 0,
	OFF: 0, // Assuming OFF is an alias for NONE
	ERROR: 1,
	USAGE: 2,
};

export default Effect.gen(function* () {
	const InitData = yield* InitDataService;
	const IPC = yield* IPCService;
	const Clipboard = yield* ClipboardService;

	// --- State and Events ---
	const LogLevelRef = yield* Ref.make(
		InitData.logLevel as number as LogLevel,
	);
	const { event: onDidChangeLogLevel, Fire: fireLogLevel } =
		CreateEventStream<LogLevel>();
	const { event: onDidChangeShell } = CreateEventStream<string>();
	const { event: onDidChangeTelemetryEnabled } = CreateEventStream<boolean>();

	// --- RPC Handlers ---
	// The IPC service should have a way to listen to incoming messages.
	// We register a handler that fires the log level change event.
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler(
			"$onDidChangeLogLevel",
			([Level]): Promise<void> => Effect.runPromise(fireLogLevel(Level)),
		),
	);

	// --- Effects for Methods ---
	const CreateOpenExternalEffect = (Target: Uri) =>
		IPC.SendRequest<boolean>("$openUri", [
			TypeConverter.URI.FromAPI(Target),
			{ allowExternalSchemes: true },
		]).pipe(Effect.map((Result) => !!Result));

	const CreateAsExternalURIEffect = (Target: Uri) =>
		IPC.SendRequest<any>("$asExternalUri", [
			TypeConverter.URI.FromAPI(Target),
		]).pipe(Effect.map((Dto) => TypeConverter.URI.ToAPI(Dto)));

	const GetAppRoot = () => {
		const AppRootUri = InitData.environment.appRoot as Uri;
		return AppRootUri?.scheme === Schemas.file
			? AppRootUri.fsPath
			: undefined;
	};

	const TelemetryLevelValue =
		(InitData.telemetryInfo ).telemetryLevel ?? TelemetryLevel.NONE;

	const ServiceImplementation: Service["Type"] = {
		appName: InitData.environment.appName || "Cocoon Editor",
		appRoot: GetAppRoot(),
		appHost: (InitData.environment ).appHost || "desktop",
		uriScheme: (InitData.environment ).appUriScheme || "cocoon-code",
		language: InitData.environment.appLanguage || "en",
		machineId: InitData.telemetryInfo.machineId,
		sessionId: InitData.telemetryInfo.sessionId,
		isTrusted: (InitData.workspace )?.isTrusted ?? true,
		isRemote: !!(InitData.remote )?.isRemote,
		remoteName: (InitData.remote )?.authority?.split("+")[0],
		shell:
			process.platform === "win32"
				? process.env["ComSpec"] || "pwsh.exe"
				: process.env["SHELL"] || "/bin/sh",
		uiKind: (InitData ).uiKind === 2 ? UIKind.Web : UIKind.Desktop,
		isNewAppInstall: (InitData ).isNewAppInstall === true,
		isBuilt: InitData.quality !== "development",
		get logLevel() {
			return Effect.runSync(Ref.get(LogLevelRef));
		},
		get isTelemetryEnabled() {
			return TelemetryLevelValue !== TelemetryLevel.NONE;
		},

		// Events
		onDidChangeLogLevel: onDidChangeLogLevel,
		onDidChangeShell: onDidChangeShell,
		onDidChangeTelemetryEnabled: onDidChangeTelemetryEnabled,

		// Injected Services/Objects
		clipboard: Clipboard,
		openExternal: (Target) =>
			Effect.runPromise(CreateOpenExternalEffect(Target)),
		asExternalUri: (Target) =>
			Effect.runPromise(CreateAsExternalURIEffect(Target)),
	};

	return ServiceImplementation;
});
