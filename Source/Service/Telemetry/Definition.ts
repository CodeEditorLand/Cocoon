/**
 * @module Definition (Telemetry)
 * @description Implements the telemetry service, handling event collection and forwarding
 * to the Mountain host process based on user privacy settings.
 */

import { Effect } from "effect";
import type { SerializedError } from "vs/base/common/errors.js";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry.js";

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
		InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
	const ProductConfig = (InitData.product as any)?.telemetryOptOut;

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
	) => {
		const SerializableError: SerializedError =
			CaughtError instanceof Error
				? {
						name: CaughtError.name,
						message: CaughtError.message,
						stack: CaughtError.stack,
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
		getTelemetryInfo: () => Promise.resolve(InitData.telemetryInfo),
		setEnabled: () => {},
		publicLog: (EventName, Data) => {
			Effect.runFork(LogPublicEvent(EventName, Data));
		},
		publicLog2: (EventName, Data) => {
			Effect.runFork(LogPublicEvent(EventName, Data as any));
		},
		onExtensionError: (Extension, Error) => {
			Effect.runFork(LogExtensionError(Extension, Error));
			return false;
		},
	};

	return TelemetryImplementation;
});
