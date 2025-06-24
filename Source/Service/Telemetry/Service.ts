/*
 * File: Cocoon/Source/Service/Telemetry/Service.ts
 * Role: Defines the Telemetry service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Implement the `vscode.env.telemetry` API.
 *   - Handle event collection and forwarding based on user privacy settings.
 */

import { Effect, Ref } from "effect";
import type { SerializedError } from "vs/base/common/errors.js";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import type {
	LogLevel as VscLogLevel,
	ILoggerService,
	ILogger,
} from "vs/platform/log/common/log.js";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry.js";

import { InitData } from "../InitData/Service.js";
import { IPC } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";

// --- Internal Helper ---
const ToTelemetryLevel = (logLevel: VscLogLevel): TelemetryLevel => {
	switch (logLevel) {
		case 0:
			return TelemetryLevel.NONE; // Off
		case 1:
		case 2:
		case 3:
			return TelemetryLevel.USAGE; // Trace, Debug, Info
		case 4:
		case 5:
			return TelemetryLevel.ERROR; // Warning, Error
		default:
			return TelemetryLevel.NONE;
	}
};

// --- Service Definition ---
export class Telemetry extends Effect.Service<IExtHostTelemetry>()(
	"Service/Telemetry",
	{
		effect: Effect.gen(function* (Generator) {
			const InitDataService = yield* Generator(InitData);
			const IPCService = yield* Generator(IPC);
			const LogService = yield* Generator(Logger);

			const TelemetryLevelRef = yield* Generator(
				Ref.make<TelemetryLevel>(
					ToTelemetryLevel(InitDataService.logLevel),
				),
			);
			const ProductConfigRef = yield* Generator(
				Ref.make<{ usage: boolean; error: boolean }>({
					usage: true,
					error: true,
				}),
			);

			const ShouldSendEvent = (
				Type: "usage" | "error",
			): Effect.Effect<boolean, never> =>
				Effect.gen(function* (Generator) {
					const level = yield* Generator(Ref.get(TelemetryLevelRef));
					if (level < TelemetryLevel.ERROR) return false;
					const config = yield* Generator(Ref.get(ProductConfigRef));
					if (Type === "error" && !config.error) return false;
					if (Type === "usage" && level < TelemetryLevel.USAGE)
						return false;
					if (Type === "usage" && !config.usage) return false;
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
					LogService.Error(
						`Extension error reported for '${Extension.value}'.`,
						SerializableError,
					).pipe(
						Effect.andThen(
							IPCService.SendNotification("$onExtensionError", [
								Extension,
								SerializableError,
							]),
						),
					),
					ShouldSendEvent("error"),
				).pipe(Effect.catchAll(() => Effect.void));
			};

			const ServiceImplementation: IExtHostTelemetry = {
				_serviceBrand: undefined,
				_onDidChangeTelemetryEnabled: undefined as any,
				onDidChangeTelemetryEnabled: undefined as any,
				_onDidChangeTelemetryConfiguration: undefined as any,
				onDidChangeTelemetryConfiguration: undefined as any,
				getTelemetryConfiguration: () =>
					Effect.runSync(Ref.get(TelemetryLevelRef)) >=
					TelemetryLevel.USAGE,
				getTelemetryDetails: () => {
					const level = Effect.runSync(Ref.get(TelemetryLevelRef));
					const config = Effect.runSync(Ref.get(ProductConfigRef));
					return {
						isCrashEnabled: level >= TelemetryLevel.CRASH,
						isErrorsEnabled:
							config.error && level >= TelemetryLevel.ERROR,
						isUsageEnabled:
							config.usage && level >= TelemetryLevel.USAGE,
					};
				},
				instantiateLogger: (
					_extension: IExtensionDescription,
					_sender: any,
					_options?: any,
				): ILogger => ({}) as any,
				getBuiltInCommonProperties: (
					_extension: IExtensionDescription,
				) => ({}),
				$initializeTelemetryLevel(
					level,
					_supportsTelemetry,
					productConfig,
				) {
					Effect.runSync(Ref.set(TelemetryLevelRef, level));
					Effect.runSync(
						Ref.set(
							ProductConfigRef,
							productConfig ?? { usage: true, error: true },
						),
					);
				},
				$onDidChangeTelemetryLevel(level) {
					Effect.runSync(Ref.set(TelemetryLevelRef, level));
				},
				onExtensionError: (
					Extension: ExtensionIdentifier,
					Error: Error,
				): boolean => {
					Effect.runFork(LogExtensionError(Extension, Error));
					return false;
				},
			};

			return ServiceImplementation;
		}),
	},
) {}
