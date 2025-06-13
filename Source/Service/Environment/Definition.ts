/**
 * @module Definition (Env)
 * @description The live implementation of the Env service.
 */

import { Effect, Ref, Stream } from "effect";
import { Schemas } from "vs/base/common/network.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import { UIKind, type Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { ClipboardProvider } from "../Clipboard.js";
import { InitDataService } from "../InitData.js";
import { IpcProvider } from "../Ipc.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const InitData = yield* _(InitDataService);
	const Ipc = yield* _(IpcProvider.Tag);
	const Clipboard = yield* _(ClipboardProvider.Tag);

	// --- State and Events ---
	const LogLevelRef = yield* _(Ref.make(InitData.logLevel as number));
	const OnDidChangeLogLevelEvent = CreateEventStream<any>();
	const OnDidChangeShellEvent = CreateEventStream<string>();
	const OnDidChangeTelemetryEvent = CreateEventStream<boolean>();

	// --- RPC Handlers ---
	Ipc.RegisterInvokeHandler("$acceptShellChanged", ([shell]) =>
		OnDidChangeShellEvent.Fire(shell).pipe(Effect.runPromise),
	);
	Ipc.RegisterInvokeHandler("$acceptLogLevelChanged", ([level]) =>
		Ref.set(LogLevelRef, level).pipe(
			Effect.flatMap(() => OnDidChangeLogLevelEvent.Fire(level)),
			Effect.runPromise,
		),
	);

	// --- Effects for Methods ---
	const OpenExternalEffect = (Target: Uri) =>
		Ipc.SendRequest<boolean>("$openUri", [
			TypeConverter.Uri.fromApi(Target),
			{ allowExternalSchemes: true },
		]).pipe(Effect.map((result) => !!result));

	const AsExternalUriEffect = (Target: Uri) =>
		Ipc.SendRequest<any>("$asExternalUri", [
			TypeConverter.Uri.fromApi(Target),
		]).pipe(Effect.map((dto) => TypeConverter.Uri.toApi(dto)));

	const GetAppRoot = () => {
		const uri = InitData.environment.appRoot;
		return uri?.scheme === Schemas.file ? uri.fsPath : undefined;
	};

	const TelemetryLevelValue =
		InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;

	const ServiceImplementation: Interface = {
		appName: InitData.environment.appName || "Cocoon Editor",
		appRoot: GetAppRoot(),
		appHost: InitData.environment.appHost || "desktop",
		uriScheme: InitData.environment.appUriScheme || "cocoon-code",
		language: InitData.environment.appLanguage || "en",
		machineId: InitData.telemetryInfo.machineId,
		sessionId: InitData.telemetryInfo.sessionId,
		isTrusted: InitData.workspace?.trusted ?? true,
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
		clipboard: Clipboard,
		openExternal: (target) => Effect.runPromise(OpenExternalEffect(target)),
		asExternalUri: (target) =>
			Effect.runPromise(AsExternalUriEffect(target)),
	};

	return ServiceImplementation;
});
