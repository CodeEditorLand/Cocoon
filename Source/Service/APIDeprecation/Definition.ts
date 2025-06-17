/*
 * File: Cocoon/Source/Service/APIDeprecation/Definition.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:48 UTC
 * Dependency: ../Log/Service.js, ./Service.js, effect, vs/platform/extensions/common/extensions.js
 */

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
export default Effect.gen(function* () {
	const Log = yield* LogService;

	const Report = (
		ExtensionID: ExtensionIdentifier,
		Usage: string,
		Message: string,
	): Effect.Effect<void, never> =>
		Log.Warn(
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
			let BackingField: any = Target[PropertyKey];
			let HasReported = false;

			const ReportOnce = (Key: string | symbol) => {
				if (!HasReported) {
					Effect.runFork(ReportEffect(Key));
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
		Report,
		Deprecated,
	};

	return ServiceImplementation;
});
