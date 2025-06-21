/**
 * @module Definition (APIDeprecation)
 * @description The live implementation of the APIDeprecation service.
 */

import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

import LogService from "../Log/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the APIDeprecation service.
 */
export default Effect.gen(function* (G) {
	const Log = yield* G(LogService);

	const ReportEffect = (
		ExtensionID: ExtensionIdentifier,
		Usage: string,
		Message: string,
	): Effect.Effect<void, never> =>
		Log.Warn(
			`Extension '${ExtensionID.value}' used deprecated API: '${Usage}'. Message: ${Message}`,
		);

	const DeprecatedDecorator = (
		ExtensionID: ExtensionIdentifier,
		Feature: string,
		Message: string,
	): PropertyDecorator => {
		const CreateReportEffect = (PropertyName: string | symbol) =>
			ReportEffect(
				ExtensionID,
				`${Feature} (property: ${String(PropertyName)})`,
				Message,
			);

		return (Target: Object, PropertyKey: string | symbol): void => {
			let BackingField: any = (Target as any)[PropertyKey];
			let HasReported = false;

			const ReportOnce = (Key: string | symbol) => {
				if (!HasReported) {
					// `runFork` is appropriate here because a property accessor must be
					// synchronous, but logging is an asynchronous side effect.
					Effect.runFork(CreateReportEffect(Key));
					HasReported = true;
				}
			};

			Object.defineProperty(Target, PropertyKey, {
				configurable: true,
				enumerable: true,
				get() {
					ReportOnce(PropertyKey);
					return BackingField;
				},
				set(NewValue: any) {
					ReportOnce(PropertyKey);
					BackingField = NewValue;
				},
			});
		};
	};

	const ServiceImplementation: Service["Type"] = {
		Report: ReportEffect,
		Deprecated: DeprecatedDecorator,
	};

	return ServiceImplementation;
});
