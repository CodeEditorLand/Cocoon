/**
 * @module Definition (APIDeprecation)
 * @description The live implementation of the APIDeprecation service.
 */

import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

import { Log } from "../Log.js";
import type { Interface } from "./Service.js";

/**
 * An Effect that builds the live implementation of the APIDeprecation service.
 */
export const Definition = Effect.gen(function* (_) {
	const LogService = yield* _(Log.Tag);

	const Report = (
		ExtensionID: ExtensionIdentifier,
		Usage: string,
		Message: string,
	): Effect.Effect<void, never> =>
		LogService.Warn(
			`Extension '${ExtensionID.value}' used deprecated API: '${Usage}'. Message: ${Message}`,
		);

	const Deprecated = (
		ExtensionID: ExtensionIdentifier,
		Feature: string,
		Message: string,
	): PropertyDecorator => {
		// This inner function creates the logging Effect and forks it,
		// because property accessors must be synchronous.
		const ReportEffect = (PropertyName: string | symbol) =>
			Report(
				ExtensionID,
				`${Feature} (property: ${String(PropertyName)})`,
				Message,
			);

		return (Target: Object, PropertyKey: string | symbol): void => {
			let BackingField: any = (Target as any)[PropertyKey];
			let hasReported = false;

			const reportOnce = (key: string | symbol) => {
				if (!hasReported) {
					Effect.runFork(ReportEffect(key));
					hasReported = true;
				}
			};

			Object.defineProperty(Target, PropertyKey, {
				configurable: true,
				enumerable: true,
				get() {
					reportOnce(PropertyKey);
					return BackingField;
				},
				set(NewValue: any) {
					reportOnce(PropertyKey);
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
