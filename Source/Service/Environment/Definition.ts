/**
 * @module Definition (Environment)
 * @description The live implementation of the Environment service.
 */

import { Effect, Ref, Stream } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import { UIKind, type LogLevel, type Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { Clipboard } from "../Clipboard.js";
import { InitData } from "../InitData.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const InitDataService = yield* _(InitData.Tag);
	const IPCService = yield* _(IPC.Tag);
	const ClipboardService = yield* _(Clipboard.Tag);

	// --- State and Events ---
	const LogLevelRef = yield* _(
		Ref.make(InitDataService.logLevel as number as LogLevel),
	);
	const OnDidChangeLogLevelEvent = CreateEventStream<LogLevel>();
	const OnDidChangeShellEvent = CreateEventStream<string>();
	const OnDidChangeTelemetryEvent = CreateEventStream<boolean>();

	// --- RPC Handlers ---
	// The IPC service should have a way to listen to incoming messages.
	// We register a handler that fires the log level change event.
	IPCService.on<LogLevel>("$onDidChangeLogLevel", (level) =>
		Effect.runPromise(OnDidChangeLogLevelEvent.Fire(level)),
	);
	// A handler for telemetry changes would also be registered here.

	// --- Effects for Methods ---
	const OpenExternal = (Target: Uri) =>
		IPCService.SendRequest<boolean>("$openUri", [
			TypeConverter.URIConverter.FromAPI(Target),
			{ allowExternalSchemes: true },
		]).pipe(Effect.map((result) => !!result));

	const AsExternalURI = (Target: Uri) =>
		IPCService.SendRequest<any>("$asExternalUri", [
			TypeConverter.URIConverter.FromAPI(Target),
		]).pipe(Effect.map((dto) => TypeConverter.URIConverter.ToAPI(dto)));

	const GetAppRoot = () => {
		const uri = InitDataService.environment.appRoot as any; // Cast from internal type
		return uri?.scheme === Schemas.file ? uri.fsPath : undefined;
	};

	const TelemetryLevelValue =
		InitDataService.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;

	const ServiceImplementation: Interface = {
		appName: InitDataService.environment.appName || "Cocoon Editor",
		appRoot: GetAppRoot(),
		appHost: InitDataService.environment.appHost || "desktop",
		uriScheme: InitDataService.environment.appUriScheme || "cocoon-code",
		language: InitDataService.environment.appLanguage || "en",
		machineId: InitDataService.telemetryInfo.machineId,
		sessionId: InitDataService.telemetryInfo.sessionId,
		isTrusted: InitDataService.workspace?.isTrusted ?? true,
		isRemote: !!InitDataService.remote?.isRemote,
		remoteName: InitDataService.remote?.authority?.split("+")[0],
		shell:
			process.platform === "win32"
				? process.env["ComSpec"] || "pwsh.exe"
				: process.env["SHELL"] || "/bin/sh",
		uiKind: InitDataService.uiKind === 2 ? UIKind.Web : UIKind.Desktop,
		isNewAppInstall: (InitDataService as any).isNewAppInstall === true,
		isBuilt: InitDataService.quality !== "development",
		get logLevel() {
			return Ref.get(LogLevelRef).pipe(Effect.runSync);
		},
		get isTelemetryEnabled() {
			return (
				TelemetryLevelValue !== TelemetryLevel.NONE &&
				TelemetryLevelValue !== TelemetryLevel.OFF
			);
		},

		// Events
		onDidChangeLogLevel: OnDidChangeLogLevelEvent.Stream.pipe(
			Stream.toEvent,
		),
		onDidChangeShell: OnDidChangeShellEvent.Stream.pipe(Stream.toEvent),
		onDidChangeTelemetryEnabled: OnDidChangeTelemetryEvent.Stream.pipe(
			Stream.toEvent,
		),

		// Injected Services/Objects
		clipboard: ClipboardService,
		openExternal: (target) => Effect.runPromise(OpenExternal(target)),
		asExternalUri: (target) => Effect.runPromise(AsExternalURI(target)),
	};

	return ServiceImplementation;
});
