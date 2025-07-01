/**
 * @module APIDeprecation
 * @description Defines the service for reporting and handling the usage of
 * deprecated APIs by extensions.
 */

import { Effect } from "effect";
import type { ExtensionIdentifier } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/platform/extensions/common/extensions.js";

import { LoggerService } from "./Logger.js";

/**
 * @interface APIDeprecation
 * @description The contract for the APIDeprecation service.
 */
export interface APIDeprecation {
	/**
	 * Creates an `Effect` that logs a warning about deprecated API usage.
	 * @param ExtensionId The identifier of the extension using the API.
	 * @param Usage A string identifying the specific deprecated API used (e.g., 'workspace.rootPath').
	 * @param Message A message explaining the deprecation and suggesting alternatives.
	 * @returns A `void` `Effect`.
	 */
	readonly Report: (
		ExtensionId: ExtensionIdentifier,
		Usage: string,
		Message: string,
	) => Effect.Effect<void, never>;

	/**
	 * A property decorator that automatically reports usage of a deprecated property.
	 * @param ExtensionId The identifier of the extension owning the deprecated property.
	 * @param Feature The name of the feature or class containing the property.
	 * @param Message A message explaining the deprecation.
	 * @returns A `PropertyDecorator`.
	 */
	readonly Deprecated: (
		ExtensionId: ExtensionIdentifier,
		Feature: string,
		Message: string,
	) => PropertyDecorator;
}

/**
 * @class APIDeprecation
 * @description The `Effect.Service` for handling API deprecations. It provides
 * methods to report usage and a decorator to automatically wrap deprecated properties.
 */
export class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",
	{
		effect: Effect.gen(function* () {
			const Logger = yield* LoggerService;

			const Report = (
				ExtensionId: ExtensionIdentifier,
				Usage: string,
				Message: string,
			): Effect.Effect<void, never> =>
				Logger.Warn(
					`Extension '${ExtensionId.value}' used deprecated API: '${Usage}'. Message: ${Message}`,
				);

			const Deprecated = (
				ExtensionId: ExtensionIdentifier,
				Feature: string,
				Message: string,
			): PropertyDecorator => {
				const CreateReport = (PropertyName: string | symbol) =>
					Report(
						ExtensionId,
						`${Feature} (property: ${String(PropertyName)})`,
						Message,
					);

				return (Target: Object, PropertyKey: string | symbol): void => {
					let BackingField: any = (Target as any)[PropertyKey];
					let HasReported = false;

					const ReportOnce = (Key: string | symbol) => {
						if (!HasReported) {
							// `runFork` is used because a property accessor must be synchronous,
							// but logging is an asynchronous side effect.
							Effect.runFork(CreateReport(Key));
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

			return { Report, Deprecated };
		}),
	},
) {}
