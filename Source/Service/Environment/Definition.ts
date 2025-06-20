

/**
 * @module Definition (Environment)
 * @description The live implementation of the Environment service.
 */

import { Effect, Ref } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { UIKind, type LogLevel, type Uri } from "vscode";

import URIConverter from "../../TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import ClipboardService from "../Clipboard/Service.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

// This is defined in `vs/platform/telemetry/common/telemetry.js`.
const TelemetryLevel = {
	NONE: 0,
	CRASH: 1,
	ERROR: 2,
	USAGE: 3,
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
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler(
			"$onDidChangeLogLevel",
			([Level]): Promise<void> => Effect.runPromise(fireLogLevel(Level)),
		),
	);

	// --- Effects for Methods ---
	const CreateOpenExternalEffect = (Target: Uri) =>
		IPC.SendRequest<boolean>("$openUri", [
			URIConverter.FromAPI(Target),
			{ allowExternalSchemes: true },
		]).pipe(Effect.map((Result) => !!Result));

	const CreateAsExternalURIEffect = (Target: Uri) =>
		IPC.SendRequest<any>("$asExternalUri", [
			URIConverter.FromAPI(Target),
		]).pipe(Effect.map((Dto) => URIConverter.ToAPI(Dto)));

	const GetAppRoot = () => {
		const AppRootUri = InitData.environment.appRoot;
		return AppRootUri?.scheme === Schemas.file
			? AppRootUri.fsPath
			: undefined;
	};

	// `telemetryLevel` is a root property on IExtensionHostInitData
	const TelemetryLevelValue = InitData.logLevel ?? TelemetryLevel.NONE;

	// The `isTrusted` property is not on `IStaticWorkspaceData`. It must be obtained from a different source
	// or assumed to be true. We will assume true if no workspace is present.
	const isTrusted = InitData.workspace
		? ((InitData.workspace as any).isTrusted ?? true)
		: true;

	const ServiceImplementation: Service["Type"] = {
		appName: InitData.environment.appName || "Cocoon Editor",
		appRoot: GetAppRoot(),
		appHost: InitData.environment.appHost || "desktop",
		uriScheme: InitData.environment.appUriScheme || "cocoon-code",
		language: InitData.environment.appLanguage || "en",
		machineId: InitData.telemetryInfo.machineId,
		sessionId: InitData.telemetryInfo.sessionId,
		isTrusted: isTrusted,
		isRemote: !!InitData.remote?.isRemote,
		remoteName: InitData.remote?.authority?.split("+")[0],
		shell:
			process.platform === "win32"
				? process.env["ComSpec"] || "pwsh.exe"
				: process.env["SHELL"] || "/bin/sh",
		uiKind: InitData.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
		isNewAppInstall:
			Date.now() -
				new Date(InitData.telemetryInfo.firstSessionDate).getTime() <
			1000 * 60 * 60 * 24,
		isBuilt: InitData.quality !== "development",
		get logLevel() {
			return Effect.runSync(Ref.get(LogLevelRef));
		},
		get isTelemetryEnabled() {
			return TelemetryLevelValue >= TelemetryLevel.USAGE;
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
