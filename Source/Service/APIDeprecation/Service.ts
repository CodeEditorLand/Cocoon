/*
 * File: Cocoon/Source/Service/APIDeprecation/Service.ts
 * Role: Defines the APIDeprecation service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for reporting and handling deprecated API usage.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import { Logger } from "../Log/Service.js";

export class APIDeprecation extends Effect.Service<APIDeprecation>()(
	"Service/APIDeprecation",
	{
		effect: Effect.gen(function* (Generator) {
			const LogService = yield* Generator(Logger);

			const ReportEffect = (
				ExtensionID: ExtensionIdentifier,
				Usage: string,
				Message: string,
			): Effect.Effect<void, never> =>
				LogService.Warn(
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

			const ServiceImplementation = {
				Report: ReportEffect,
				Deprecated: DeprecatedDecorator,
			};

			return ServiceImplementation;
		}),
	},
) {}
