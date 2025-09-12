/**
 * @module Telemetry
 * @description Defines the service that implements the `vscode.env.telemetry` API.
 * It handles the collection and forwarding of telemetry and error events to the
 * host process, respecting the user's configured privacy and logging levels.
 */

import type { SerializedError } from "@codeeditorland/output/vs/base/common/errors.js";
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import type { LogLevel as VSCodeLogLevel } from "@codeeditorland/output/vs/platform/log/common/log.js";
import { TelemetryLevel } from "@codeeditorland/output/vs/platform/telemetry/common/telemetry.js";
import type { ExtHostTelemetryShape } from "@codeeditorland/output/vs/workbench/api/common/extHost.protocol.js";
import type { IExtHostTelemetry } from "@codeeditorland/output/vs/workbench/api/common/extHostTelemetry.js";
import { Effect, Ref } from "effect";
import type { TelemetryLoggerOptions, TelemetrySender } from "vscode";

import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";

/**
 * @description An internal helper to convert the `LogLevel` from the host to the
 * `TelemetryLevel` used by the service.
 * @param LogLevel The log level from the host.
 * @returns The corresponding `TelemetryLevel`.
 */
const ConvertToTelemetryLevel = (LogLevel: VSCodeLogLevel): TelemetryLevel => {
	switch (LogLevel) {
		case 0:
			return TelemetryLevel.NONE;
		case 1:
		case 2:
		case 3:
			return TelemetryLevel.USAGE;
		case 4:
		case 5:
			return TelemetryLevel.ERROR;
		default:
			return TelemetryLevel.NONE;
	}
};

/**
 * @class TelemetryService
 * @description The `Effect.Service` for the Telemetry service.
 */
export class TelemetryService extends Effect.Service<IExtHostTelemetry>()(
	"Service/Telemetry",
	{
		effect: Effect.gen(function* () {
			const InitData = yield* InitDataService;
			const IPC = yield* IPCService;
			const Logger = yield* LoggerService;

			const TelemetryLevelRef = yield* Ref.make<TelemetryLevel>(
				ConvertToTelemetryLevel(InitData.logLevel),
			);
			const ProductConfigRef = yield* Ref.make<{
				usage: boolean;
				error: boolean;
			}>({ usage: true, error: true });

			const ShouldSendEvent = (
				Type: "usage" | "error",
			): Effect.Effect<boolean, never> =>
				Effect.gen(function* () {
					const Level = yield* Ref.get(TelemetryLevelRef);
					if (Level < TelemetryLevel.ERROR) return false;
					const Config = yield* Ref.get(ProductConfigRef);
					if (Type === "error" && !Config.error) return false;
					if (Type === "usage" && Level < TelemetryLevel.USAGE)
						return false;
					if (Type === "usage" && !Config.usage) return false;
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
					Logger.Error(
						`Extension error reported for '${Extension.value}'.`,
						SerializableError,
					).pipe(
						Effect.andThen(
							IPC.SendNotification("$onExtensionError", [
								Extension,
								SerializableError,
							]),
						),
					),
					ShouldSendEvent("error"),
				).pipe(Effect.catchAll(() => Effect.void));
			};

			// FIX: Provide a more complete stub to satisfy the IExtHostTelemetry interface.
			const ServiceImplementation: IExtHostTelemetry = {
				_serviceBrand: undefined,
				_productConfig: { usage: true, error: true },
				_level: TelemetryLevel.NONE,
				_oldTelemetryEnablement: false,
				_inLoggingOnlyMode: false,
				_telemetryLoggers: new Map(),
				_onDidChangeTelemetryConfiguration: new Emitter<void>(),
				onDidChangeTelemetryConfiguration: new Emitter<void>().event,
				_onDidChangeTelemetryEnabled: new Emitter<boolean>(),
				onDidChangeTelemetryEnabled: new Emitter<boolean>().event,
				getTelemetryConfiguration: () =>
					Effect.runSync(Ref.get(TelemetryLevelRef)) >=
					TelemetryLevel.USAGE,
				getTelemetryDetails: () => {
					const Level = Effect.runSync(Ref.get(TelemetryLevelRef));
					const Config = Effect.runSync(Ref.get(ProductConfigRef));
					return {
						isCrashEnabled: Level >= TelemetryLevel.CRASH,
						isErrorsEnabled:
							Config.error && Level >= TelemetryLevel.ERROR,
						isUsageEnabled:
							Config.usage && Level >= TelemetryLevel.USAGE,
					};
				},
				instantiateLogger: (
					_extension: IExtensionDescription,
					_sender: TelemetrySender,
					_options?: TelemetryLoggerOptions,
				): any => ({
					logUsage: () => {},
					logError: () => {},
					isUsageEnabled: false,
					isErrorsEnabled: false,
					onDidChangeEnableStates: new AbortController().signal,
					dispose: () => {},
				}),
				getBuiltInCommonProperties: (
					_extension: IExtensionDescription,
				) => ({}),
				$initializeTelemetryLevel(
					level: TelemetryLevel,
					_supportsTelemetry: any,
					productConfig: any,
				) {
					Effect.runSync(Ref.set(TelemetryLevelRef, level));
					Effect.runSync(
						Ref.set(
							ProductConfigRef,
							productConfig ?? { usage: true, error: true },
						),
					);
				},
				$onDidChangeTelemetryLevel(level: any) {
					Effect.runSync(Ref.set(TelemetryLevelRef, level));
				},
				onExtensionError: (
					Extension: ExtensionIdentifier,
					Error: Error,
				): boolean => {
					Effect.runFork(LogExtensionError(Extension, Error));
					return false;
				},
				dispose() {},
			} as unknown as IExtHostTelemetry & ExtHostTelemetryShape;

			return ServiceImplementation;
		}),
	},
) {}
