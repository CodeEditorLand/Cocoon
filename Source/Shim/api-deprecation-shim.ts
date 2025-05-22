/*---------------------------------------------------------------------------------------------
 * Cocoon API Deprecation Shim (api-deprecation-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostApiDeprecationService`. Its primary role in VS Code is to
 * track and potentially warn about the usage of deprecated extension APIs.
 *
 * For Cocoon's MVP, this can be a very simple shim that essentially does nothing
 * or logs warnings, as full deprecation tracking and UI warnings are complex.
 *
 * Key Interactions:
 * - Injected into the API factory (`createApiFactory` in `index.ts`).
 * - The API factory calls methods on this service when deprecated parts of the
 *   `vscode` API object are accessed by extensions.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
// Actual VS Code interface
import { IExtHostApiDeprecationService as VscodeIExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";

import { BaseCocoonShim, IExtHostRpcService, ILogService } from "./_baseShim";

// TODO: Ensure VscodeIExtHostApiDeprecationService is correctly imported or defined locally.
export interface CocoonIExtHostApiDeprecationService
	extends VscodeIExtHostApiDeprecationService {
	// No Cocoon-specific extensions needed for this service currently.
}

export class ShimExtHostApiDeprecationService
	extends BaseCocoonShim
	implements CocoonIExtHostApiDeprecationService
{
	public readonly _serviceBrand: undefined;

	constructor(
		// Not typically used by deprecation service for its core logic
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostApiDeprecationService", rpcService, logService);

		// Can be too noisy for a simple service
		// this._log("Initialized (basic stub).");
	}

	public report(
		extensionId: ExtensionIdentifier,

		useDeprecated: string,

		message: string,
	): void {
		// Renamed `deprecatedMethodName` to `deprecatedUsage` for broader meaning
		// The original JS for index.ts didn't show this service being used, but createApiFactory often takes it.
		// For Cocoon MVP, just log a warning.
		this._logWarn(
			`Extension '${extensionId.value}' uses deprecated API: '${useDeprecated}'. Message: ${message}`,
		);

		// TODO: In a fuller implementation, this might send telemetry or show a more prominent warning to the developer.
	}

	public reportUsage(
		identifier: ExtensionIdentifier,

		feature: string,

		message: string,
	): void {
		this._logWarn(
			`Extension '${identifier.value}' usage report: Feature='${feature}'. Message: ${message}`,
		);
	}

	public Deprecated(
		extensionId: ExtensionIdentifier,

		name: string,

		message: string,
	): PropertyDecorator {
		const report = this.report.bind(this, extensionId, name, message);

		return (_target: Object, key: string | symbol) => {
			let val: any;

			Object.defineProperty(target, key, {
				get() {
					report();

					return val;
				},

				set(newVal: any) {
					report();

					val = newVal;
				},
			});
		};
	}

	public Profiling(name: string): MethodDecorator {
		// Basic NOP for profiling decorator in shim
		return (
			_target: Object,

			_key: string | symbol,

			descriptor: PropertyDescriptor,
		) => descriptor;
	}
}
