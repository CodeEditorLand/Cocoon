/**
 * @module Definition (Telemetry)
 * @description Implements the telemetry service, handling event collection and forwarding
 * to the Mountain host process based on user privacy settings.
 */

import { Effect, Ref } from "effect";
import type { SerializedError } from "vs/base/common/errors.js";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import type { LogLevel as VscLogLevel } from "vs/platform/log/common/log.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";

import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";

/**
 * Converts the `LogLevel` from `InitData` to the `TelemetryLevel` used by the telemetry service.
 * This mapping is based on VS Code's typical behavior where telemetry settings derive from log levels.
 * @param logLevel The log level from the host.
 * @returns The corresponding telemetry level.
 */
export const ToLevel = (logLevel: VscLogLevel): TelemetryLevel => {
	switch (logLevel) {
		// Off
		case 0:
			return TelemetryLevel.NONE;

		// Trace
		case 1:
		// Debug
		case 2:
		// Info
		case 3:
			return TelemetryLevel.USAGE;

		// Warning
		case 4:
			return TelemetryLevel.ERROR;

		// Error
		case 5:
			return TelemetryLevel.ERROR;

		default:
			return TelemetryLevel.NONE;
	}
};

/**
 * An Effect that builds the live implementation of the Telemetry service.
 */
export default Effect.gen(function* () {
	const InitData = yield* InitDataService;

	const IPC = yield* IPCService;

	const Log = yield* LogService;

	// --- State ---
	// Create refs to hold the state, mirroring ExtHostTelemetry's private fields.
	const telemetryLevelRef = yield* Ref.make<TelemetryLevel>(
		ToLevel(InitData.logLevel),
	);

	const productConfigRef = yield* Ref.make<{
		usage: boolean;

		error: boolean;
	}>({ usage: true, error: true });

	// --- Helpers ---
	const ShouldSendEvent = (
		Type: "usage" | "error",
	): Effect.Effect<boolean, never> =>
		Effect.gen(function* () {
			const level = yield* Ref.get(telemetryLevelRef);

			if (level < TelemetryLevel.ERROR) {
				return false;
			}

			const config = yield* Ref.get(productConfigRef);

			if (Type === "error" && !config.error) {
				return false;
			}

			if (Type === "usage" && level < TelemetryLevel.USAGE) {
				return false;
			}

			if (Type === "usage" && !config.usage) {
				return false;
			}

			return true;
		});

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

		return Effect.whenEffect(
			Log.Error(
				`Extension error reported for '${Extension.value}'.`,

				SerializableError,
			).pipe(
				Effect.flatMap(() =>
					IPC.SendNotification("$onExtensionError", [
						Extension,

						SerializableError,
					]),
				),
			),

			ShouldSendEvent("error"),
		).pipe(Effect.catchAll(() => Effect.void));
	};

	// --- Implementation ---
	// This object now fully stubs the IExtHostTelemetry interface.
	const TelemetryImplementation: Service = {
		_serviceBrand: undefined,

		_onDidChangeTelemetryEnabled: undefined as any,

		onDidChangeTelemetryEnabled: undefined as any,

		_onDidChangeTelemetryConfiguration: undefined as any,

		onDidChangeTelemetryConfiguration: undefined as any,

		getTelemetryConfiguration: () => {
			const level = Effect.runSync(Ref.get(telemetryLevelRef));

			return level >= TelemetryLevel.USAGE;
		},

		getTelemetryDetails: () => {
			const level = Effect.runSync(Ref.get(telemetryLevelRef));

			const config = Effect.runSync(Ref.get(productConfigRef));

			return {
				isCrashEnabled: level >= TelemetryLevel.CRASH,

				isErrorsEnabled: config.error && level >= TelemetryLevel.ERROR,

				isUsageEnabled: config.usage && level >= TelemetryLevel.USAGE,
			};
		},

		instantiateLogger: (
			_extension: IExtensionDescription,

			_sender: any,

			_options?: any,
		) => ({}) as any,

		getBuiltInCommonProperties: (_extension: IExtensionDescription) => ({}),

		$initializeTelemetryLevel(level, _supportsTelemetry, productConfig) {
			Effect.runSync(Ref.set(telemetryLevelRef, level));

			Effect.runSync(
				Ref.set(
					productConfigRef,

					productConfig ?? { usage: true, error: true },
				),
			);
		},

		$onDidChangeTelemetryLevel(level) {
			Effect.runSync(Ref.set(telemetryLevelRef, level));

			// In a full implementation, this would also fire the onDidChange... events.
		},

		onExtensionError: (
			Extension: ExtensionIdentifier,

			Error: Error,
		): boolean => {
			Effect.runFork(LogExtensionError(Extension, Error));

			return false;
		},
	} as unknown as Service;

	return TelemetryImplementation;
});
