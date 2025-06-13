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

import { InitData } from "./InitData.js";
import { IPC } from "./IPC.js";
import { Log } from "./Log.js";

// --- Service Definition ---

export type Interface = IExtHostTelemetry;
export const Tag = Context.Tag<Interface>("Service/Telemetry");

// --- Live Implementation ---

const Definition = Effect.gen(function* (_) {
	const InitDataService = yield* _(InitData.Tag);
	const IPCService = yield* _(IPC.Tag);
	const LogService = yield* _(Log.Tag);

	const TelemetryLevelValue =
		InitDataService.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
	const ProductConfig = (InitDataService.product as any)?.telemetryOptOut;

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

	const LogPublicEvent = (EventName: string, Data?: Record<string, any>) =>
		LogService.Debug(`Telemetry event: '${EventName}'`, Data).pipe(
			Effect.flatMap(() =>
				Effect.when(
					IPCService.SendNotification("$publicLog", [
						EventName,
						Data,
					]),
					() => ShouldSendEvent("usage"),
				),
			),
			Effect.catchAll(() => Effect.unit), // Telemetry should never crash the host
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

		return LogService.Error(
			`Extension error reported for '${Extension.value}'.`,
			SerializableError,
		).pipe(
			Effect.flatMap(() =>
				Effect.when(
					IPCService.SendNotification("$onExtensionError", [
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

		getTelemetryInfo: () => Promise.resolve(InitDataService.telemetryInfo),

		setEnabled: () => {
			// No-op: Telemetry enablement is controlled by the host (Mountain).
		},

		publicLog: (eventName, data) => {
			Effect.runFork(LogPublicEvent(eventName, data));
		},

		publicLog2: (eventName, data) => {
			Effect.runFork(LogPublicEvent(eventName, data as any));
		},

		onExtensionError: (extension, error) => {
			Effect.runFork(LogExtensionError(extension, error));
			// Always return false to indicate that the error was not "handled"
			// by telemetry and should continue to be processed by other handlers.
			return false;
		},
	};

	return ServiceImplementation;
});

export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(IPC.Live, Log.Live)),
	// InitData service must be provided by the top-level ApplicationLayer
);
