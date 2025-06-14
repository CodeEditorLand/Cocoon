/**
 * @module Definition (Telemetry)
 * @description Implements the telemetry service, handling event collection and forwarding
 * to the Mountain host process based on user privacy settings.
 */

import { Context, Effect } from "effect";
import type { SerializedError } from "vs/base/common/errors.js";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

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

export default Effect.gen(function* () {
	const InitData = yield* InitDataService;
	const IPC = yield* IPCService;
	const Log = yield* LogService;

	const TelemetryLevelValue =
		InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
	const ProductConfig = (InitData.product as any)?.telemetryOptOut;

	const ShouldSendEvent = (type: "usage" | "error"): boolean => {
		if (TelemetryLevelValue === TelemetryLevel.NONE) {
			return false;
		}
		if (type === "error" && ProductConfig?.error === true) {
			return false;
		}
		if (type === "usage" && ProductConfig?.usage === true) {
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
		const SerializableError =
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
							Extension.value,
							SerializableError,
						]),
					() => ShouldSendEvent("error"),
				),
			),
			Effect.catchAll(() => Effect.void),
		);
	};

	const ServiceImplementation: Context.Tag.Service<any> = {
		_serviceBrand: undefined,
		getTelemetryInfo: () => Promise.resolve(InitData.telemetryInfo),
		setEnabled: () => {},
		publicLog: (eventName, data) => {
			Effect.runFork(LogPublicEvent(eventName, data));
		},
		publicLog2: (eventName, data) => {
			Effect.runFork(LogPublicEvent(eventName, data as any));
		},
		onExtensionError: (extension, error) => {
			Effect.runFork(LogExtensionError(extension, error));
			return false;
		},
	};

	return ServiceImplementation;
});
