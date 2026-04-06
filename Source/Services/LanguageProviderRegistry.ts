/**
 * @module Services/LanguageProviderRegistry
 * @description
 * Singleton registry mapping numeric provider handles to VS Code extension
 * language provider objects. Shared between APIFactoryService (which populates
 * the registry when extensions register providers) and GRPCServerService
 * (which invokes providers when Mountain requests feature results).
 *
 * Flow:
 *   Extension registers hover provider
 *   → APIFactoryService assigns Handle N, calls Register(N, provider)
 *   → Mountain receives register_hover_provider notification, stores Handle N
 *
 *   Sky requests hover at position
 *   → Mountain calls Cocoon gRPC ProcessMountainRequest("$provideHover", [N, uri, position])
 *   → GRPCServerService.routeRequest routes to Invoke(N, "provideHover", [uri, position])
 *   → provider.provideHover(document, position, token) executes
 *   → result serialized and returned to Mountain → Sky → Monaco
 */

/** Raw VS Code provider object stored by handle. */
type ProviderObject = Record<string, unknown>;

/** Thread-safe (single-threaded JS) map of handle → provider. */
const Callbacks = new Map<number, ProviderObject>();

/**
 * Register a provider with the given handle.
 * Called by APIFactoryService when an extension calls register*Provider().
 */
export function Register(Handle: number, Provider: ProviderObject): void {
	Callbacks.set(Handle, Provider);
}

/**
 * Unregister a provider by handle.
 * Called by the dispose() function returned to the extension.
 */
export function Unregister(Handle: number): void {
	Callbacks.delete(Handle);
}

/**
 * Retrieve the provider for a handle, or undefined if not registered.
 * Called by GRPCServerService when Mountain invokes a provider.
 */
export function Get(Handle: number): ProviderObject | undefined {
	return Callbacks.get(Handle);
}

/**
 * Return all currently registered handles and their provider types.
 * Useful for diagnostics.
 */
export function ListHandles(): readonly number[] {
	return Array.from(Callbacks.keys());
}
