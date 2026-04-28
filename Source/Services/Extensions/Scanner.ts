/**
 * @module Services/Extensions/Scanner
 * @description
 * Cocoon-side extension scanner facade.
 *
 * Atom X1 (scaffold) - the Extension-Service-Lift plan (L1) ultimately
 * replaces the hand-built registry in `ExtensionHostHandler.ts` with VS
 * Code's canonical `IExtensionsScannerService` + `IExtensionManagementService`
 * DI-wired into Cocoon. That lift is bigger than a single atom, so this
 * file provides a thin facade over today's registry with a surface shaped
 * like VS Code's so future atoms can swap the implementation without
 * rippling through every call site.
 *
 * Today: delegates every call to the `HandlerContext.ExtensionRegistry`
 * populated by `HandleInitializeExtensionHost` from Mountain's init data.
 * Tomorrow: lifts to `ExtensionsScannerService.scanAllExtensions()`.
 *
 * Consumers MUST NOT depend on Scanner-internal shapes beyond what this
 * module's exported types declare. The registry Map is considered private.
 */

import type { HandlerContext } from "../Handler/HandlerContext.js";

/**
 * Minimal `ILocalExtension` shape that Wind's ExtensionsWorkbenchService
 * destructures. Mountain already synthesises this from its Rust registry;
 * Cocoon mirrors the same shape so a future flip to canonical scanner
 * output doesn't break Wind.
 */
export type ScannedExtension = {
	readonly type: number;
	readonly isBuiltin: boolean;
	readonly isUserBuiltin: boolean;
	readonly identifier: { id: string; uuid?: string };
	readonly manifest: Record<string, unknown>;
	readonly location: { scheme: string; path: string };
	readonly targetPlatform: string;
	readonly publisherDisplayName?: string;
	readonly validations?: ReadonlyArray<[number, string]>;
	readonly preRelease?: boolean;
	readonly installedTimestamp?: number;
};

export type ScanOptions = {
	readonly includeUninstalled?: boolean;
	readonly includeInvalid?: boolean;
	readonly profileLocation?: string;
};

export type ScannerStatistics = {
	readonly totalExtensions: number;
	readonly builtinCount: number;
	readonly userCount: number;
	readonly activationEventCount: number;
};

/**
 * Read every extension currently registered with Cocoon. Today this is
 * the in-memory map populated from Mountain's `InitializeExtensionHost`
 * payload + every `$deltaExtensions` diff. Ordering matches registry
 * insertion order (Map preserves insertion).
 */
export const ScanAllExtensions = (
	Context: HandlerContext,
	_Options: ScanOptions = {},
): ReadonlyArray<ScannedExtension> =>
	Array.from(
		Context.ExtensionRegistry.values(),
	) as ReadonlyArray<ScannedExtension>;

/**
 * Read only built-in extensions (isBuiltin=true). Mirrors VS Code's
 * `scanSystemExtensions` shape so the lifted service can replace this.
 */
export const ScanSystemExtensions = (
	Context: HandlerContext,
): ReadonlyArray<ScannedExtension> =>
	Array.from(Context.ExtensionRegistry.values()).filter(
		(Extension: any) => Extension?.isBuiltin === true,
	) as ReadonlyArray<ScannedExtension>;

/**
 * Read only user-installed extensions (isBuiltin=false). VSIX installs
 * land here; built-ins do not.
 */
export const ScanUserExtensions = (
	Context: HandlerContext,
): ReadonlyArray<ScannedExtension> =>
	Array.from(Context.ExtensionRegistry.values()).filter(
		(Extension: any) => Extension?.isBuiltin === false,
	) as ReadonlyArray<ScannedExtension>;

/**
 * Look up one extension by identifier (publisher.name) regardless of
 * origin. Returns undefined when the identifier is not registered.
 */
export const GetExtension = (
	Context: HandlerContext,
	Identifier: string,
): ScannedExtension | undefined =>
	Context.ExtensionRegistry.get(Identifier) as ScannedExtension | undefined;

/**
 * Report counts for observability dashboards and the log banner. The
 * future lifted scanner can surface its own metrics here without changing
 * the exported shape.
 */
export const GetStatistics = (Context: HandlerContext): ScannerStatistics => {
	const All = Array.from(Context.ExtensionRegistry.values());
	let Builtin = 0;
	let User = 0;
	for (const Extension of All as any[]) {
		if (Extension?.isBuiltin === true) {
			Builtin++;
		} else {
			User++;
		}
	}
	return {
		totalExtensions: All.length,
		builtinCount: Builtin,
		userCount: User,
		activationEventCount: Context.ActivationEventIndex.size,
	};
};

export default {
	ScanAllExtensions,
	ScanSystemExtensions,
	ScanUserExtensions,
	GetExtension,
	GetStatistics,
};
