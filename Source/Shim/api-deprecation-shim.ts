/*---------------------------------------------------------------------------------------------
 * Cocoon API Deprecation Shim (api-deprecation-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostApiDeprecationService` interface from VS Code. This service
 * plays a role in the VS Code extension host by tracking and providing warnings about
 * the usage of deprecated extension APIs. It is typically utilized by the central API
 * factory (`createApiFactory`) when constructing the `vscode` API object that is
 * exposed to extensions. This allows parts of the `vscode` API that have been
 * deprecated to automatically report their usage when accessed by an extension.
 *
 * For Cocoon's current implementation (MVP), this shim focuses on providing the necessary
 * API surface and primarily logs warnings to the console when a deprecated API feature
 * is reportedly used. It does not implement more advanced features like telemetry for
 * deprecation usage, UI notifications to developers about deprecated API use in their
 * extensions, or persistent tracking of such usage.
 *
 * Responsibilities:
 * - Implementing the `IExtHostApiDeprecationService` interface, ensuring type
 *   compatibility for services that depend on it (like the API factory).
 * - Providing a `report(extensionId, deprecatedUsage, message)` method that logs a
 *   warning message detailing the deprecated API usage.
 * - Providing a `reportUsage(identifier, feature, message)` method, also for logging.
 * - Offering a `Deprecated(extensionId, name, message)` property decorator factory.
 *   When this decorator is applied to a class property, any get or set access to
 *   that property will trigger a call to the `report` method.
 * - Providing a `Profiling(name)` method decorator, which is a No-Operation (NOP)
 *   in this shim implementation, returning the original method descriptor unchanged.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostApiDeprecationService` is registered with Dependency
 *   Injection (DI) in `Cocoon/index.ts`.
 * - It is typically injected as a dependency into the API factory function responsible
 *   for creating the `vscode` API object.
 * - The API factory can then use the `Deprecated` decorator to wrap properties of the
 *   `vscode` object that are considered deprecated, or directly call the `report()`
 *   method when a deprecated function is invoked.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 * - (Future Enhancement) Could be extended to send deprecation reports to a
 *   `MainThreadApiDeprecationService` on Mountain via RPC if centralized tracking or
 *   more sophisticated reporting of deprecated API usage is desired.
 *
 *--------------------------------------------------------------------------------------------*/

import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
// Import the actual VS Code interface definition for IExtHostApiDeprecationService
// to ensure this shim correctly implements the expected contract.
import type { IExtHostApiDeprecationService as VscodeIExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";

import {
	BaseCocoonShim,
	// For logging via BaseCocoonShim
	type ILogServiceForShim,
	// For BaseCocoonShim, though not directly used by this shim's logic
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

/**
 * Cocoon's implementation of the `IExtHostApiDeprecationService`.
 * This service is responsible for handling and reporting the usage of deprecated APIs
 * by extensions. In this Minimum Viable Product (MVP) version, its primary action
 * is to log warnings to the console when such usage is reported.
 */
export class ShimExtHostApiDeprecationService
	extends BaseCocoonShim
	implements VscodeIExtHostApiDeprecationService
{
	// Ensure implementation of the VS Code interface
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimExtHostApiDeprecationService.
	 * @param rpcService The RPC service adapter. This is passed to `BaseCocoonShim` but is
	 *                   not directly used by this shim's current logging-only functionality.
	 *                   It would be used if this shim were extended to send deprecation
	 *                   reports to Mountain via RPC.
	 * @param logService The logging service instance, used for outputting deprecation warnings.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostApiDeprecationService", rpcService, logService);

		// Initial log can be verbose for a service that's mostly passive until called.
		// this._logDebug("Initialized (logging-only implementation for API deprecations).");
	}

	/**
	 * This shim, in its current logging-only implementation, does not strictly require
	 * an RPC connection to Mountain for its core functionality.
	 * Overrides the base method to reflect this.
	 * @returns `false`, as RPC is not currently required by this shim.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc VscodeIExtHostApiDeprecationService.report}
	 *
	 * Reports the usage of a deprecated API feature by a specific extension.
	 * This method is typically called by the API factory when a deprecated part of the
	 * `vscode` API object is accessed by an extension's code.
	 *
	 * @param extensionId The `ExtensionIdentifier` of the extension that used the deprecated API.
	 * @param deprecatedUsage A string that identifies the deprecated API feature
	 *                        (e.g., "vscode.window.oldMethodName", "someExtension.someDeprecatedProperty").
	 * @param message A human-readable message that explains the deprecation, often suggesting
	 *                alternatives or reasons for deprecation.
	 */
	public report(
		extensionId: ExtensionIdentifier,

		deprecatedUsage: string,

		message: string,
	): void {
		this._logWarn(
			`Extension '${extensionId.value}' used deprecated API feature: '${deprecatedUsage}'. Deprecation message: "${message}"`,
		);

		// TODO (Future Enhancement): If centralized telemetry for deprecated API usage is desired,

		// this method could be extended to send this information to Mountain via an RPC call.
		// This would require a corresponding `MainThreadApiDeprecationService` on Mountain.
		// Example (conceptual):
		// if (this._rpcService) {

		// Assuming such a context ID
		//   const proxy = this._rpcService.getProxy(MainContext.MainThreadApiDeprecationService);

		//   proxy?.$reportDeprecatedApiUsage(extensionId.value, deprecatedUsage, message).catch(err => {

		//     this._logError("Failed to send deprecation report to MainThread:", err);

		//   });

		// }
	}

	/**
	 * {@inheritDoc VscodeIExtHostApiDeprecationService.reportUsage}
	 *
	 * Reports general API usage information. This method can be used for various reporting
	 * purposes, including but not limited to deprecations, usage of experimental APIs,
	 *
	 * or other notable API interactions that warrant a report or log entry.
	 *
	 * @param identifier The `ExtensionIdentifier` of the extension whose API usage is being reported.
	 * @param feature A string identifying the API feature or aspect being reported.
	 * @param message A descriptive message providing details about the usage.
	 */
	public reportUsage(
		identifier: ExtensionIdentifier,

		feature: string,

		message: string,
	): void {
		this._logWarn(
			`API Usage Report for Extension '${identifier.value}': Feature='${feature}'. Message: "${message}"`,
		);
	}

	/**
	 * {@inheritDoc VscodeIExtHostApiDeprecationService.Deprecated}
	 *
	 *
	 * A property decorator factory that marks a class property (which can be a data field
	 * or an accessor with get/set) as deprecated. When a property that has been decorated
	 * with `@this.Deprecated(...)` is accessed (for reading via its getter) or modified
	 * (for writing via its setter), the `report` method of this service will be automatically
	 * invoked with the provided deprecation details.
	 *
	 * This decorator works by replacing the original property with a new property descriptor
	 * that has custom getter and setter functions. These custom functions first call the
	 * reporting function and then perform the original get/set behavior using a backing
	 * field that stores the property's actual value.
	 *
	 * @param extensionId The `ExtensionIdentifier` of the extension that *owns* or defines the
	 *                    deprecated property. (In VS Code's internal usage, this often refers to
	 *                    the extension that *contributes* the API being deprecated, or a generic
	 *                    system identifier if the API is part of the core `vscode` namespace.)
	 * @param featureName The conceptual name or identifier of the deprecated feature or property.
	 *                   This is used in the deprecation report.
	 * @param message The human-readable deprecation message, which should explain why the
	 *                feature is deprecated and suggest alternatives if available.
	 * @returns A standard TypeScript `PropertyDecorator` function.
	 */
	public Deprecated(
		extensionId: ExtensionIdentifier,

		// The conceptual name of the deprecated feature for reporting
		featureName: string,

		message: string,
	): PropertyDecorator {
		// `reportFn` is created by binding `this.report` to the current service instance.
		// It will be called whenever the decorated property is accessed or set.
		// `actualPropertyName` will be the true name of the property the decorator is applied to.
		const reportFn = (actualPropertyName: string | symbol) => {
			this.report(
				extensionId,

				`${featureName} (property: ${String(actualPropertyName)})`,

				message,
			);
		};

		return (target: Object, propertyKey: string | symbol): void => {
			// `backingFieldValue` stores the actual value of the property.
			// It's initialized with the property's existing value (if any) at the time the
			// decorator is applied. This is important for properties that might already have values.
			let backingFieldValue: any = (target as any)[propertyKey];

			Object.defineProperty(target, propertyKey, {
				// Allows the property to be re-configured or deleted later if necessary.
				configurable: true,

				// Ensures the property appears in `for...in` loops and `Object.keys()`.
				enumerable: true,

				get() {
					// Report access before returning the value.
					reportFn(propertyKey);

					return backingFieldValue;
				},

				set(newValue: any) {
					// Report modification before setting the new value.
					reportFn(propertyKey);

					backingFieldValue = newValue;
				},
			});
		};
	}

	/**
	 * {@inheritDoc VscodeIExtHostApiDeprecationService.Profiling}
	 *
	 *
	 * A method decorator factory, typically intended for use in performance profiling scenarios
	 * or for logging detailed information about method calls (e.g., arguments, execution time).
	 *
	 * In this Cocoon shim implementation, `Profiling` is a No-Operation (NOP) decorator.
	 * It returns the original method descriptor unmodified and performs no actual profiling
	 * or logging actions when the decorated method is called.
	 *
	 * @param _profilingName The name or category of the profiling event. This parameter is
	 *                       unused in this NOP implementation.
	 * @returns A NOP method decorator that does not alter the behavior or descriptor of the
	 *          decorated method.
	 */
	public Profiling(_profilingName: string): MethodDecorator {
		// This is a NOP (No Operation) decorator for the shim.
		// It simply returns the original property descriptor for the method, thus making
		// no changes to the method's behavior or metadata.
		return (
			// The prototype of the class for instance methods, or the constructor for static methods.
			_target: Object,

			// The name of the method being decorated.
			_propertyKey: string | symbol,

			// The property descriptor of the method.
			descriptor: PropertyDescriptor,
		): PropertyDescriptor => descriptor;
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		// Can be verbose for a simple service
		// this._logDebug("Disposed.");
	}
}
