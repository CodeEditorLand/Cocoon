/**
 * @module Definition (APIDeprecation)
 * @description The live implementation of the APIDeprecation service.
 */

import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

import { LogProvider } from "../Log.js";
import type { Interface } from "./Service.js";

/**
 * An Effect that builds the live implementation of the APIDeprecation service.
 */
export const Definition = Effect.gen(function* (_) {
	const Log = yield* _(LogProvider.Tag);

	const Report = (
		ExtensionId: ExtensionIdentifier,
		Usage: string,
		Message: string,
	): Effect.Effect<void> =>
		Log.Warn(
			`Extension '${ExtensionId.value}' used deprecated API: '${Usage}'. Message: ${Message}`,
		);

	const Deprecated = (
		ExtensionId: ExtensionIdentifier,
		Feature: string,
		Message: string,
	): PropertyDecorator => {
		// This inner function creates the logging Effect and forks it,
		// because property accessors are synchronous.
		const ReportEffect = (PropertyName: string | symbol) =>
			Report(
				ExtensionId,
				`${Feature} (property: ${String(PropertyName)})`,
				Message,
			);

		return (Target: Object, PropertyKey: string | symbol): void => {
			let BackingField: any = (Target as any)[PropertyKey];

			Object.defineProperty(Target, PropertyKey, {
				configurable: true,
				enumerable: true,
				get() {
					Effect.runFork(ReportEffect(PropertyKey));
					return BackingField;
				},
				set(NewValue: any) {
					Effect.runFork(ReportEffect(PropertyKey));
					BackingField = NewValue;
				},
			});
		};
	};

	const ServiceImplementation: Interface = {
		Report,
		Deprecated,
	};

	return ServiceImplementation;
});
