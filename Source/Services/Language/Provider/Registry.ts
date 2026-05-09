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
	const Provider = Callbacks.get(Handle);

	if (process.env.Trace) {
		console.warn(
			`[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`,
		);
	}

	return Provider;
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

/**
 * Allocate a new numeric handle WITHOUT registering a provider object.
 *
 * Use this for register_*_provider notifications that Cocoon does not
 * dispatch back to locally (debug_configuration, file_system, task,
 * uri_handler, terminal_*, notebook_*, status_bar, progress, webview*,
 * tree_data_provider, etc.). Previously these call sites used string
 * handles like `debugConfig:1` which Mountain parsed as `u64` - the
 * parse always yielded `None` and Mountain fell back to `handle=0`,
 * causing every provider of the same type to collide on the same key
 * in Mountain's `HashMap<u32, ProviderRegistrationDTO>` registry.
 *
 * Sharing the counter with `RegisterAutoHandle` means no collision
 * between language-provider handles and stand-alone provider handles.
 */
export function NextProviderHandle(): number {
	return NextHandle++;
}

/** Command registry - maps command IDs to callbacks. */
const Commands = new Map<string, Function>();

/**
 * Register a command callback.
 * Called by the vscode API shim when extensions call commands.registerCommand().
 */
export function RegisterCommand(CommandId: string, Callback: Function): void {
	Commands.set(CommandId, Callback);
}

/**
 * Probe whether a command ID has a local Cocoon handler. Used by
 * `CommandsRoute.Route` to pick the tier BEFORE dispatching, so the
 * decision can be logged without actually executing. Keeps the
 * Cocoon-local-vs-Mountain-remote split observable.
 */
export function HasCommand(CommandId: string): boolean {
	return Commands.has(CommandId);
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
 * Remove a command registration. Called by the dispose() returned to
 * extensions from `vscode.commands.registerCommand(...)`.
 */
export function UnregisterCommand(CommandId: string): void {
	Commands.delete(CommandId);
}

/**
 * Return all currently registered command IDs.
 */
export function ListCommands(): readonly string[] {
	return Array.from(Commands.keys());
}

/**
 * Return all currently registered handles and their provider types.
 * Useful for diagnostics.
 */
export function ListHandles(): readonly number[] {
	return Array.from(Callbacks.keys());
}
