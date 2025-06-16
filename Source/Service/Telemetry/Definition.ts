/*
 * File: Cocoon/Source/Service/Telemetry/Definition.ts
 * Responsibility:
 * Modified: 2025-06-16 14:42:08 UTC
 * Dependency: ../IPC/Service.js, ../InitData/Service.js, ../Log/Service.js, ./Service.js, effect, vs/base/common/errors.js, vs/platform/extensions/common/extensions.js, vs/workbench/api/common/extHostTelemetry.js
 */

/**
 * @module Definition (Telemetry)
 * @description Implements the telemetry service, handling event collection and forwarding
 * to the Mountain host process based on user privacy settings.
 */

import { Effect } from "effect";
import type { SerializedError } from "vs/base/common/errors.js";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import type {
	IExtHostTelemetry,
	TelemetryInfo,
} from "vs/workbench/api/common/extHostTelemetry.js";

import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";

// Placeholders for internal types
const TelemetryLevel = {
	NONE: 0,
	OFF: 0, // Assuming OFF is an alias for NONE
	ERROR: 1,
	USAGE: 2,
};

/**
 * An Effect that builds the live implementation of the Telemetry service.
 */
export default Effect.gen(function* () {
	const InitData = yield* InitDataService;
	const IPC = yield* IPCService;
	const Log = yield* LogService;

	const TelemetryLevelValue =
		InitData.telemetry.telemetryLevel ?? TelemetryLevel.NONE;
	const ProductConfig = InitData.product?.telemetryOptOut;

	const ShouldSendEvent = (Type: "usage" | "error"): boolean => {
		if (TelemetryLevelValue === TelemetryLevel.NONE) {
			return false;
		}
		if (Type === "error" && ProductConfig?.error === true) {
			return false;
		}
		if (Type === "usage" && ProductConfig?.usage === true) {
			return false;
		}
		return true;
	};

	const LogPublicEvent = (EventName: string, Data?: Record<string, any>) =>
		Log.Debug(`Telemetry event: '${EventName}'`, Data).pipe(
			Effect.flatMap(() =>
				Effect.when(
					() => IPC.SendNotification("$publicLog", [EventName, Data]),
					() => ShouldSendEvent("usage"),
				),
			),
			Effect.catchAll(() => Effect.void),
		);

	const LogExtensionError = (
		Extension: ExtensionIdentifier,
		CaughtError: Error | SerializedError,
	): Effect.Effect<void, never> => {
		const SerializableError: SerializedError =
			CaughtError instanceof Error
				? {
						name: CaughtError.name,
						message: CaughtError.message,
						stack: CaughtError.stack ?? "",
						$isError: true,
						noTelemetry: false,
					}
				: CaughtError;

		return Log.Error(
			`Extension error reported for '${Extension.value}'.`,
			SerializableError,
		).pipe(
			Effect.flatMap(() =>
				Effect.when(
					() =>
						IPC.SendNotification("$onExtensionError", [
							Extension,
							SerializableError,
						]),
					() => ShouldSendEvent("error"),
				),
			),
			Effect.catchAll(() => Effect.void),
		);
	};

	const TelemetryImplementation: IExtHostTelemetry = {
		_serviceBrand: undefined,
		getTelemetryInfo: (): Promise<TelemetryInfo> =>
			Promise.resolve(InitData.telemetry),
		setEnabled: (_isEnabled: boolean): void => {
			// This would typically involve an IPC call to the host.
		},
		publicLog: (EventName: string, Data?: object): void => {
			Effect.runFork(
				LogPublicEvent(EventName, Data as Record<string, any>),
			);
		},
		publicLog2: <T extends object = any>(
			EventName: string,
			Data?: T,
		): void => {
			Effect.runFork(
				LogPublicEvent(EventName, Data as Record<string, any>),
			);
		},
		onExtensionError: (
			Extension: ExtensionIdentifier,
			Error: Error,
		): boolean => {
			Effect.runFork(LogExtensionError(Extension, Error));
			return false; // Return value indicates if the error was "handled"
		},
		$publicLog: (eventName, data) =>
			Effect.runPromise(LogPublicEvent(eventName, data)),
		$publicLog2: (eventName, data) =>
			Effect.runPromise(LogPublicEvent(eventName, data)),
		$onExtensionError: (extensionId, error) =>
			Effect.runPromise(LogExtensionError(extensionId, error)),
	};

	return TelemetryImplementation;
});
