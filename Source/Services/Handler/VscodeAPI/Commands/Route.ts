/**
 * @module Handler/VscodeAPI/CommandsRoute
 * @description
 * Routing decision for `vscode.commands.executeCommand`. Matches the
 * pattern from `WorkspaceNamespace/FileSystemRoute.ts`: pure function,
 * no Mountain RTT to make the decision, dev-log-observable.
 *
 * Commands in VS Code split three ways:
 *
 *   1. **Extension-contributed** - registered by any extension via
 *      `vscode.commands.registerCommand(id, cb)`. Live in Cocoon's
 *      `LanguageProviderRegistry` command map. Executing them never
 *      touches Mountain: the callback runs in Cocoon's Node process,
 *      returns, and the result propagates up the Promise chain. This is
 *      Tier A in the fs-tier analogy - purely local.
 *
 *   2. **Workbench / native** - `vscode.open`, `workbench.action.*`,
 *      `editor.action.*`, `setContext`, etc. Mountain's CommandRegistry
 *      owns these (either as Native handlers in Rust or as Proxied to
 *      the workbench via Tauri events). They MUST go through Mountain
 *      because only Mountain can talk to the renderer that paints the
 *      Quick Pick / Command Palette / editor view. This is Tier C.
 *
 *   3. **Built-in workbench commands with no backend** -
 *      `getTelemetrySenderObject`, `testing.clearTestResults`, view
 *      auto-suffixes (`.focus`, `.resetViewLocation`). Mountain's
 *      `CommandProvider::ExecuteCommand` `None` arm treats these as
 *      silent no-ops returning `Value::Null`. From Cocoon's perspective
 *      they LOOK like Tier C (go to Mountain) but Mountain short-
 *      circuits - not a Cocoon concern to track here.
 *
 * ## Why a route module when the current code already falls through?
 *
 * `CommandsNamespace.executeCommand` already does local-first by trying
 * `LanguageProviderRegistry.ExecuteCommand` and falling back to Mountain
 * only when the local path returns `undefined`. That's already the right
 * behaviour. The benefit of extracting the decision is:
 *
 *   - **Observability**: every dispatch logs `[DEV:CMD-ROUTE] route=…`
 *     so the tier split is verifiable empirically per-run, same as
 *     `[DEV:FS-ROUTE]`.
 *   - **Explicit bypass**: a future `Tier.Commands` value can force
 *     every command through Mountain (for e.g. a centralised audit log
 *     build profile) without touching call sites.
 *   - **Symmetry**: every namespace routing decision lives in a peer
 *     file next to the namespace it serves. The pattern scales to
 *     `WindowRoute`, `DebugRoute`, `ScmRoute` without bespoke shapes
 *     per namespace.
 */

export type CommandsRoute = "local" | "mountain";

/**
 * Shape of the Cocoon-local command registry that `executeCommand`
 * queries first. Only the `Has` probe is needed here - the actual
 * invocation stays in `CommandsNamespace` to avoid duplicating the
 * argument-spread call site.
 */
export interface CommandsLocalRegistry {
	Has(CommandId: string): boolean;
}

/**
 * Pick the backend tier for a command execution.
 *
 * Current rule: if the command ID is present in Cocoon's local registry,
 * route local. Otherwise Mountain. No `Tier.Commands` knob yet because
 * the command set is dynamic per extension activation - gating every
 * call on an env var would require re-reading + re-keying the decision.
 * When a `Tier.Commands = "Layer2"` (force-Mountain) knob is added, the
 * local-first branch in this function will short-circuit on Layer2.
 */
export function Route(
	CommandId: string,

	Registry: CommandsLocalRegistry,
): CommandsRoute {
	return Registry.Has(CommandId) ? "local" : "mountain";
}

export const LogRoute = (CommandId: string, Decision: CommandsRoute): void => {
	// Per-command dispatch is noisy (every `setContext` / workbench action
	// / native boot command logs a line). Gate under `cmd-route` so the
	// trace stays available when diagnosing routing decisions but doesn't
	// clutter the default log.
	if (!process.env["Trace"]?.includes("cmd-route")) return;

	process.stdout.write(
		`[DEV:CMD-ROUTE] cmd=${CommandId} route=${Decision}\n`,
	;
};
