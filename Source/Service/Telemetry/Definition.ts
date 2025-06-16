// Cocoon/Source/Service/Telemetry/Definition.ts

/**
 * @module Definition (Telemetry)
 * @description Implements the telemetry service, handling event collection and forwarding
 * to the Mountain host process based on user privacy settings.
 */

import { Effect, Option } from "effect";
import type { SerializedError } from "vs/base/common/errors.js";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry.js";
import type { TelemetryInfo } from "vscode";

import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";

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
		(InitData.telemetryInfo as any).telemetryLevel ?? TelemetryLevel.NONE;
	const ProductConfig = (InitData as any).product?.telemetryOptOut;

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
		// FIX: Make it an effect
		// FIX: Correctly construct the error object to match SerializedError type.
		const SerializableError: SerializedError =
			CaughtError instanceof Error
				? {
						name: CaughtError.name,
						message: CaughtError.message,
						stack: CaughtError.stack ?? "", // stack must be a string
						$isError: true,
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

	// FIX: The service implementation must match the interface.
	const TelemetryImplementation: Service["Type"] = {
		_serviceBrand: undefined,
		// FIX: `getTelemetryInfo` should be a method returning a promise.
		getTelemetryInfo: (): Promise<TelemetryInfo> =>
			Promise.resolve(InitData.telemetryInfo),
		// FIX: `setEnabled` is a method.
		setEnabled: (_isEnabled: boolean): void => {
			// This would typically involve an IPC call to the host.
		},
		publicLog: (EventName: string, Data?: object): void => {
			Effect.runFork(LogPublicEvent(EventName, Data as any));
		},
		publicLog2: <T extends object = any>(
			EventName: string,
			Data?: T,
		): void => {
			Effect.runFork(LogPublicEvent(EventName, Data as any));
		},
		onExtensionError: (
			Extension: ExtensionIdentifier,
			Error: Error,
		): boolean => {
			Effect.runFork(LogExtensionError(Extension, Error));
			return false; // Return value indicates if the error was "handled"
		},
		// FIX: These were missing from the implementation. They are part of IExtHostTelemetry.
		// These methods in VS Code are used for more advanced, structured telemetry.
		// Stubbing them out is acceptable for this context.
		$publicLog: (eventName, data) =>
			Effect.runPromise(Effect.succeed(Option.fromNullable(data))),
		$publicLog2: (eventName, data) =>
			Effect.runPromise(Effect.succeed(Option.fromNullable(data))),
		$onExtensionError: (extensionId, error) =>
			Effect.runPromise(Effect.succeed(Option.fromNullable(error))),
	};

	return TelemetryImplementation;
});
