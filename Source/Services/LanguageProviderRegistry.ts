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
 * Auto-incrementing handle counter for extensions that register providers
 * through the vscode API shim (where the handle is assigned by Cocoon).
 */
let NextHandle = 10000;

/**
 * Register a provider and auto-assign a handle.
 * Returns the assigned handle so the caller can wire dispose().
 */
export function RegisterAutoHandle(Provider: ProviderObject): number {
	const Handle = NextHandle++;
	Callbacks.set(Handle, Provider);
	return Handle;
}

/** Command registry — maps command IDs to callbacks. */
const Commands = new Map<string, Function>();

/**
 * Register a command callback.
 * Called by the vscode API shim when extensions call commands.registerCommand().
 */
export function RegisterCommand(CommandId: string, Callback: Function): void {
	Commands.set(CommandId, Callback);
}

/**
 * Execute a registered command by ID.
 */
export function ExecuteCommand(CommandId: string, ...Args: unknown[]): unknown {
	const Handler = Commands.get(CommandId);
	if (Handler) return Handler(...Args);
	return undefined;
}

/**
 * Return all currently registered handles and their provider types.
 * Useful for diagnostics.
 */
export function ListHandles(): readonly number[] {
	return Array.from(Callbacks.keys());
}
