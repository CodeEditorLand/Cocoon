/*
 * File: Cocoon/Source/Shim/APIDeprecation.ts
 * Responsibility: Implements the deprecation reporting service for the Cocoon sidecar, logging warnings when deprecated VS Code APIs are used by extensions to maintain compatibility and encourage updates.
 * Modified: 2025-06-07 00:57:47 UTC
 * Dependency: vs/platform/extensions/common/extensions, vs/workbench/api/common/extHostApiDeprecationService
 * Export: ShimExtHostApiDeprecationService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon API Deprecation Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostApiDeprecationService` interface. This service is
 * utilized by the central API factory to track and provide warnings about the
 * usage of deprecated extension APIs.
 *
 * For Cocoon's current implementation, this shim primarily logs warnings to the console
 * when a deprecated API feature is reportedly used.
 *
 * Responsibilities:
 * - Implementing the `IExtHostApiDeprecationService` interface.
 * - Logging a warning message when its `Report` or `ReportUsage` methods are invoked.
 * - Providing a `Deprecated` property decorator factory. When this decorator is applied
 *   to a class property, any access to that property will trigger a call to the `Report` method.
 * - Providing a `Profiling` method decorator, which is a No-Operation (NOP) in this shim.
 *
 * Key Interactions:
 * - An instance is registered with Dependency Injection (DI) in `Cocoon/index.ts`.
 * - It is typically injected into the API factory function responsible for creating the `vscode` API object.
 * - Uses `BaseCocoonShim` for standardized logging.
 *
 *--------------------------------------------------------------------------------------------*/

import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import type { IExtHostApiDeprecationService as VscodeIExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_BaseShim";

/**
 * Cocoon's implementation of the `IExtHostApiDeprecationService`.
 * This service handles and reports the usage of deprecated APIs by extensions,
 * primarily by logging warnings.
 */
export class ShimExtHostApiDeprecationService
	extends BaseCocoonShim
	implements VscodeIExtHostApiDeprecationService
{
	public readonly _serviceBrand: undefined;

	constructor(
		RpcService: IRpcProtocolServiceAdapter | undefined,
		LogService: ILogServiceForShim | undefined,
	) {
		super("ExtHostApiDeprecationService", RpcService, LogService);
	}

	/**
	 * This shim's logging-only implementation does not require an RPC connection.
	 */
	protected override _RequireRpc(): boolean {
		return false;
	}

	/**
	 * Reports the usage of a deprecated API feature by a specific extension.
	 *
	 * @param ExtensionIdentifier The identifier of the extension that used the deprecated API.
	 * @param DeprecatedUsage A string that identifies the deprecated API feature.
	 * @param Message A human-readable message that explains the deprecation.
	 */
	public Report(
		ExtensionIdentifier: ExtensionIdentifier,
		DeprecatedUsage: string,
		Message: string,
	): void {
		this._LogWarn(
			`Extension '${ExtensionIdentifier.value}' used deprecated API feature: '${DeprecatedUsage}'. Deprecation message: ${Message}`,
		);
	}

	/**
	 * Reports general API usage information.
	 *
	 * @param Identifier The identifier of the extension whose API usage is being reported.
	 * @param Feature A string identifying the API feature being reported.
	 * @param Message A descriptive message providing details about the usage.
	 */
	public ReportUsage(
		Identifier: ExtensionIdentifier,
		Feature: string,
		Message: string,
	): void {
		this._LogWarn(
			`API Usage Report for Extension '${Identifier.value}': Feature='${Feature}'. Message: ${Message}`,
		);
	}

	/**
	 * A property decorator factory that marks a class property as deprecated.
	 * When a decorated property is accessed or modified, the `Report` method of
	 * this service will be automatically invoked.
	 *
	 * @param ExtensionIdentifier The identifier of the extension that owns the deprecated property.
	 * @param FeatureName The conceptual name of the deprecated feature for reporting.
	 * @param Message The human-readable deprecation message.
	 * @returns A standard TypeScript `PropertyDecorator` function.
	 */
	public Deprecated(
		ExtensionIdentifier: ExtensionIdentifier,
		FeatureName: string,
		Message: string,
	): PropertyDecorator {
		const ReportFunction = (ActualPropertyName: string | symbol) => {
			this.Report(
				ExtensionIdentifier,
				`${FeatureName} (property: ${String(ActualPropertyName)})`,
				Message,
			);
		};

		return (Target: Object, PropertyKey: string | symbol): void => {
			let BackingFieldValue: any = (Target as any)[PropertyKey];
			Object.defineProperty(Target, PropertyKey, {
				configurable: true,
				enumerable: true,
				get() {
					ReportFunction(PropertyKey);
					return BackingFieldValue;
				},
				set(NewValue: any) {
					ReportFunction(PropertyKey);
					BackingFieldValue = NewValue;
				},
			});
		};
	}

	/**
	 * A method decorator factory for performance profiling.
	 * In this shim, `Profiling` is a No-Operation (NOP) decorator.
	 *
	 * @param ProfilingName The name of the profiling event (unused).
	 * @returns A NOP method decorator.
	 */
	public Profiling(ProfilingName: string): MethodDecorator {
		return (
			Target: Object,
			PropertyKey: string | symbol,
			Descriptor: PropertyDecorator,
		): PropertyDescriptor => Descriptor;
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override Dispose(): void {
		super.Dispose();
	}
}
