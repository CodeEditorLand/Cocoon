/**
 * @module Telemetry
 * @description Implements the telemetry service, handling event collection and forwarding
 * to the Mountain host process based on user privacy settings.
 */

import { Context, Effect, Layer } from "effect";
import type { SerializedError } from "vs/base/common/errors.js";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import {
	TelemetryLevel,
	type ITelemetryInfo,
} from "vs/platform/telemetry/common/telemetry.js";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry.js";

import { InitDataService } from "./InitData.js";
import { IpcProvider } from "./Ipc.js";
import { LogProvider } from "./Log.js";

// --- Service Definition ---

export type Interface = IExtHostTelemetry;
export const Tag = Context.Tag<Interface>("Service/Telemetry");

// --- Live Implementation ---

const Definition = Effect.gen(function* (_) {
	const InitData = yield* _(InitDataService);
	const Ipc = yield* _(IpcProvider.Tag);
	const Log = yield* _(LogProvider.Tag);

	const TelemetryLevelValue =
		InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
	const ProductConfig = (InitData.product as any)?.telemetryOptOut;

	const ShouldSendEvent = (type: "usage" | "error"): boolean => {
		if (
			TelemetryLevelValue === TelemetryLevel.NONE ||
			TelemetryLevelValue === TelemetryLevel.OFF
		) {
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

	const LogPublicEventEffect = (
		EventName: string,
		Data?: Record<string, any>,
	) =>
		Log.Debug(`Telemetry event: '${EventName}'`, Data).pipe(
			Effect.flatMap(() =>
				Effect.when(
					Ipc.SendNotification("$publicLog", [EventName, Data]),
					() => ShouldSendEvent("usage"),
				),
			),
			Effect.catchAll(() => Effect.unit), // Telemetry should never crash the host
		);

	const LogExtensionErrorEffect = (
		Extension: ExtensionIdentifier,
		ErrorValue: Error | SerializedError,
	) => {
		const SerializableError =
			ErrorValue instanceof Error
				? {
						name: ErrorValue.name,
						message: ErrorValue.message,
						stack: ErrorValue.stack,
					}
				: ErrorValue;

		return Log.Error(
			`Extension error reported for '${Extension.value}'.`,
			SerializableError,
		).pipe(
			Effect.flatMap(() =>
				Effect.when(
					Ipc.SendNotification("$onExtensionError", [
						Extension.value,
						SerializableError,
					]),
					() => ShouldSendEvent("error"),
				),
			),
			Effect.catchAll(() => Effect.unit),
		);
	};

	const ServiceImplementation: Interface = {
		_serviceBrand: undefined,

		getTelemetryInfo: () => Promise.resolve(InitData.telemetryInfo),

		setEnabled: () => {
			// No-op: Telemetry enablement is controlled by the host (Mountain).
		},

		publicLog: (eventName, data) => {
			Effect.runFork(LogPublicEventEffect(eventName, data));
		},

		publicLog2: (eventName, data) => {
			Effect.runFork(LogPublicEventEffect(eventName, data as any));
		},

		onExtensionError: (extension, error) => {
			Effect.runFork(LogExtensionErrorEffect(extension, error));
			// Always return false to indicate that the error was not "handled"
			// by telemetry and should continue to be processed by other handlers.
			return false;
		},
	};

	return ServiceImplementation;
});

export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(IpcProvider.Live, LogProvider.Live)),
	// InitDataService must be provided by the top-level AppLayer
);
