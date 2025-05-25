// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/118_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 7bb90928592c3f5d74cffa29dad47f9c60f1af486681c5dc5383c475efd3f307
// Extracted to File: Backup/TSFMSC/Code/api-deprecation-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:57.016Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE api-deprecation-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon API Deprecation Shim (api-deprecation-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostApiDeprecationService` interface. In VS Code, this service
 * is responsible for tracking and warning about the usage of deprecated extension APIs.
 * It's typically used by the API factory (`createApiFactory`) to wrap deprecated
 * properties or methods of the `vscode` API object.
 *
 * For Cocoon's current implementation, this shim primarily logs warnings when deprecated
 * APIs are accessed. It does not perform advanced tracking or UI notifications.
 *
 * Responsibilities:
 * - Implementing the `IExtHostApiDeprecationService` interface.
 * - Logging warnings when `report` or `reportUsage` is called.
 * - Providing a NOP `Deprecated` property decorator.
 * - Providing a NOP `Profiling` method decorator.
 *
 * Key Interactions:
 * - Injected into the API factory (`createApiFactory` in `index.ts` or a similar setup).
 * - The API factory calls methods on this service when deprecated parts of the `vscode`
 *   API object are accessed by extensions.
 * - Uses `BaseCocoonShim` for logging.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
// Actual VS Code interface definition
import type { IExtHostApiDeprecationService as VscodeIExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";

import {
	BaseCocoonShim,
	type IRpcProtocolServiceAdapter, // Renamed from IExtHostRpcService for clarity in BaseCocoonShim
	type ILogServiceForShim, // Renamed from ILogService for clarity in BaseCocoonShim
} from "./_baseShim";

/**
 * Cocoon's implementation of the `IExtHostApiDeprecationService`.
 * This service is responsible for handling API deprecation reports.
 */
export class ShimExtHostApiDeprecationService
	extends BaseCocoonShim
	implements VscodeIExtHostApiDeprecationService // Implement the actual VS Code interface
{
	public readonly _serviceBrand: undefined; // Required by VS Code's service types

	/**
	 * Creates an instance of ShimExtHostApiDeprecationService.
	 * @param rpcService The RPC service adapter. Currently not used by this shim's core logic but passed to base.
	 * @param logService The logging service.
	 */
	constructor(
		// rpcService is optional for this shim as it only logs locally for MVP.
		// It's passed to BaseCocoonShim which might log a warning if it's missing and _requiresRpc() is true.
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostApiDeprecationService", rpcService, logService);
		// Initial log can be verbose for a simple service.
		// this._log("Initialized (logging-only implementation).");
	}

    /**
     * This shim does not strictly require RPC for its current logging-only functionality.
     * Override base to reflect this.
     */
    protected override _requiresRpc(): boolean {
        return false;
    }

	/**
	 * Reports the usage of a deprecated API feature by an extension.
	 * @param extensionId The identifier of the extension using the deprecated API.
	 * @param deprecatedUsage A string identifying the deprecated feature (e.g., "methodName", "propertyName").
	 * @param message A human-readable message explaining the deprecation and alternatives.
	 */
	public report(
		extensionId: ExtensionIdentifier,
		deprecatedUsage: string,
		message: string,
	): void {
		this._logWarn(
			`Extension '${extensionId.value}' uses deprecated API: '${deprecatedUsage}'. Message: ${message}`,
		);
		// In a fuller implementation, this might:
		// - Send telemetry about the deprecated API usage.
		// - Trigger a UI notification to the developer if the extension is in development mode.
	}

	/**
	 * Reports general usage information, which might include deprecations or other notable API interactions.
	 * (This method name `reportUsage` might be specific or a more general version of `report`).
	 * @param identifier The identifier of the extension.
	 * @param feature A string identifying the feature being reported.
	 * @param message A descriptive message.
	 */
	public reportUsage(
		identifier: ExtensionIdentifier,
		feature: string,
		message: string,
	): void {
		this._logWarn(
			`Extension '${identifier.value}' usage report: Feature='${feature}'. Message: ${message}`,
		);
	}

	/**
	 * A property decorator that can be used to mark class properties (fields or accessors) as deprecated.
	 * When a decorated property is accessed or set, it calls the `report` method.
	 *
	 * @param extensionId The identifier of the extension defining the deprecated property.
	 * @param name The name of the deprecated property.
	 * @param message The deprecation message.
	 * @returns A property decorator function.
	 */
	public Deprecated(
		extensionId: ExtensionIdentifier,
		name: string,
		message: string,
	): PropertyDecorator {
		// Bind `this.report` to ensure correct `this` context when the decorator is applied and used.
		const reportFn = this.report.bind(this, extensionId, name, message);

		return (target: Object, propertyKey: string | symbol): void => {
			let backingFieldValue: any;

			Object.defineProperty(target, propertyKey, {
				configurable: true, // Allow redefinition if needed
				enumerable: true,   // Typically true for public properties
				get() {
					reportFn();
					return backingFieldValue;
				},
				set(newValue: any) {
					reportFn();
					backingFieldValue = newValue;
				},
			});
		};
	}

	/**
	 * A method decorator factory, typically used for performance profiling or logging method calls.
	 * In this shim, it's a No-Operation (NOP) decorator.
	 *
	 * @param _name The name or category of the profiling event (unused in this NOP implementation).
	 * @returns A NOP method decorator.
	 */
	public Profiling(_name: string): MethodDecorator {
		// This is a NOP (No Operation) decorator for the shim.
		// It returns the original property descriptor unchanged.
		return (
			_target: Object,
			_propertyKey: string | symbol,
			descriptor: PropertyDescriptor,
		): PropertyDescriptor => descriptor;
	}
}
--- END OF FILE api-deprecation-shim.ts ---