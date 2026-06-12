/**
 * @module Utility/Tier
 * @description
 * Resolves Land's tier-gating flags for Cocoon. Every capability with
 * multiple viable implementations reads its active tier from this module
 * so the selected path is:
 *
 *   (a) discoverable - `import Tier from "./Tier.js"` at any call site;
 *   (b) logged on boot - single-line banner via LandFixLog;
 *   (c) grep-able - `Tier.<Capability>` is the only spelling allowed.
 *
 * Cocoon receives tier values two ways, in precedence order:
 *
 *   1. `globalThis.__LandTiers` - populated by Cocoon's bootstrap prelude
 *      from esbuild `__LandTier_<Capability>__` substitutions. Used in
 *      shipped builds.
 *   2. `process.env.Tier<Capability>` - fallback for dev runs of Cocoon
 *      launched directly (e.g. via pnpm scripts), set by Maintain's
 *      `Debug/Build.sh` when it sources `.env.Land`.
 *
 * Defaults (right-hand side of each `Pick(...)`) must match the defaults
 * table in `.env.Land.Sample` at the repo root.
 *
 * When a new tier variable is added, update:
 *   1. `.env.Land.Sample` (default value)
 *   2. The mirror module at `Element/Wind/Source/Utility/Tier.ts`
 *   3. `Element/Mountain/build.rs::IsDeclaredTierFeature` (if Rust-gated)
 *   4. `Element/Mountain/Source/LandFixTier.rs::LogResolvedTiers` (banner)
 *
 * See `Documentation/GitHub/Workflow/TierGatedImplementationSelection.md`
 * for the full end-to-end workflow.
 */

import LandFixLog from "./Land/Fix/Log.js";

// Transport tiers ------------------------------------------------------------
export type TierRemoteProcedureCallValue = "gRPC" | "SharedMemory";

export type TierHTTPProxyValue = "HandRolled" | "Hyper";

export type TierLoggerValue = "Standard" | "Ring";

// File-system tiers ----------------------------------------------------------
export type TierFileSystemValue = "Layer2" | "Layer3" | "Layer4";

export type TierFindFilesValue = "Layer3" | "Layer4";

export type TierGlobValue = "JavaScript" | "Native";

export type TierFileWatcherValue = "Stub" | "Layer4";

export type TierSchemeAssetsValue = "Embedded" | "FileSystem" | "Hybrid";

// VS Code API tiers ----------------------------------------------------------
export type TierConfigurationValue = "Cache" | "Eager";

export type TierDiagnosticsValue = "Full" | "Delta";

export type TierClipboardValue = "Layer3" | "Layer4" | "Layer5";

export type TierOpenExternalValue = "Layer3" | "Layer4";

export type TierDocumentMirrorValue = "Full" | "Lazy";

// Lifecycle tiers ------------------------------------------------------------
export type TierExtensionActivationValue =
	| "Sequential"
	| "Parallel4"
	| "Parallel8"
	| "Parallel16";

export type TierExtensionScanValue = "Sequential" | "Parallel";

export type TierModuleCacheValue = "Off" | "Simple" | "Shared";

// Telemetry tiers ------------------------------------------------------------
export type TierTelemetryValue = "Synchronous" | "Batched" | "Off";

// IPC routing tiers ----------------------------------------------------------
export type TierIPCValue = "Mountain" | "NodeDeferred" | "Node";

// Per-subsystem routing tiers (added 2026-05-25). Each tier names where the
// dispatch arms for a given VS Code API subsystem run. The flavor overlays
// at `.env.Land.{RustOnly,NodeFirst,Full}` set all of them at once.
//
//   Mountain - native Rust handler in Mountain's IPC dispatcher
//   Node     - forward every call to Cocoon via gRPC (extension-host path)
export type TierTerminalValue = "Mountain" | "Node";

export type TierSCMValue = "Mountain" | "Node";

export type TierDebugValue = "Mountain" | "Node";

export type TierLanguageFeaturesValue = "Mountain" | "Node";

export type TierSearchValue = "Mountain" | "Node";

export type TierOutputChannelValue = "Mountain" | "Node";

export type TierNativeHostValue = "Mountain" | "Node";

export type TierTreeViewValue = "Mountain" | "Node";

export type TierStorageValue = "Mountain" | "Node";

export type TierModelValue = "Mountain" | "Node";

// `WebSocket` forwards to Cocoon over the Mist WS transport (B7-S6);
// requires TierWebSocket=Mist, falls back to Tauri IPC when disconnected.
export type TierTasksValue = "Mountain" | "Node" | "WebSocket";

export type TierAuthValue = "Mountain" | "Node" | "WebSocket";

export type TierEncryptionValue = "Mountain" | "Node";

//   Process   - Cocoon is spawned as a Node.js subprocess (default)
//   WebWorker - Extension host runs in a worker thread inside Sky (no Cocoon)
//   Disabled  - Skip Cocoon spawn entirely (kernel build)
export type TierExtensionHostValue = "Process" | "WebWorker" | "Disabled";

//   Disabled - Boot-time WS listener off (default)
//   Mountain - Listener on, served by Mist::WebSocket::ServeLocal
//   Mist     - Same as Mountain; reserved for future routing splits
export type TierWebSocketValue = "Disabled" | "Mountain" | "Mist";

// Resolution -----------------------------------------------------------------
const Injected =
	(globalThis as { __LandTiers?: Record<string, unknown> }).__LandTiers ?? {};

const Pick = <T extends string>(Capability: string, Fallback: T): T => {

	const FromInjected = Injected[Capability];

	if (typeof FromInjected === "string" && FromInjected.length > 0) {
		return FromInjected as T;
	}

	const FromEnvironment = process.env[`Tier${Capability}`];

	if (typeof FromEnvironment === "string" && FromEnvironment.length > 0) {
		return FromEnvironment as T;
	}

	return Fallback;
};

const Tier = {

	RemoteProcedureCall: Pick<TierRemoteProcedureCallValue>(
		"RemoteProcedureCall",

		"gRPC",
	),

	HTTPProxy: Pick<TierHTTPProxyValue>("HTTPProxy", "HandRolled"),

	Logger: Pick<TierLoggerValue>("Logger", "Standard"),

	FileSystem: Pick<TierFileSystemValue>("FileSystem", "Layer2"),

	FindFiles: Pick<TierFindFilesValue>("FindFiles", "Layer3"),

	Glob: Pick<TierGlobValue>("Glob", "JavaScript"),

	// Default Layer4 so `createFileSystemWatcher` forwards to Mountain's
	// native `notify`-crate implementation in `Environment/FileWatcherProvider.rs`.
	// Stub mode drops every watch registration, leaving every extension that
	// relies on file-change events (eslint, typescript, tailwind, most
	// language servers) blind to disk mutations. Override with
	// `TierFileWatcher=Stub` at launch to restore the old drop behaviour
	// for debugging.
	FileWatcher: Pick<TierFileWatcherValue>("FileWatcher", "Layer4"),

	SchemeAssets: Pick<TierSchemeAssetsValue>("SchemeAssets", "Embedded"),

	Configuration: Pick<TierConfigurationValue>("Configuration", "Cache"),

	Diagnostics: Pick<TierDiagnosticsValue>("Diagnostics", "Full"),

	Clipboard: Pick<TierClipboardValue>("Clipboard", "Layer3"),

	OpenExternal: Pick<TierOpenExternalValue>("OpenExternal", "Layer3"),

	DocumentMirror: Pick<TierDocumentMirrorValue>("DocumentMirror", "Full"),

	ExtensionActivation: Pick<TierExtensionActivationValue>(
		"ExtensionActivation",

		"Parallel8",
	),

	ExtensionScan: Pick<TierExtensionScanValue>("ExtensionScan", "Sequential"),

	ModuleCache: Pick<TierModuleCacheValue>("ModuleCache", "Simple"),

	Telemetry: Pick<TierTelemetryValue>("Telemetry", "Synchronous"),

	// IPC routing: Mountain (default) → NodeDeferred → Node
	IPC: Pick<TierIPCValue>("IPC", "Mountain"),

	// Per-subsystem routing (added 2026-05-25). Defaults match .env.Land
	// and `Mountain/build.rs::EmitTierDefaults`.
	Terminal: Pick<TierTerminalValue>("Terminal", "Mountain"),

	SCM: Pick<TierSCMValue>("SCM", "Mountain"),

	Debug: Pick<TierDebugValue>("Debug", "Mountain"),

	LanguageFeatures: Pick<TierLanguageFeaturesValue>(
		"LanguageFeatures",

		"Mountain",
	),

	Search: Pick<TierSearchValue>("Search", "Mountain"),

	OutputChannel: Pick<TierOutputChannelValue>("OutputChannel", "Mountain"),

	NativeHost: Pick<TierNativeHostValue>("NativeHost", "Mountain"),

	TreeView: Pick<TierTreeViewValue>("TreeView", "Mountain"),

	Storage: Pick<TierStorageValue>("Storage", "Mountain"),

	Model: Pick<TierModelValue>("Model", "Mountain"),

	Tasks: Pick<TierTasksValue>("Tasks", "Node"),

	Auth: Pick<TierAuthValue>("Auth", "Node"),

	Encryption: Pick<TierEncryptionValue>("Encryption", "Mountain"),

	ExtensionHost: Pick<TierExtensionHostValue>("ExtensionHost", "Process"),

	WebSocket: Pick<TierWebSocketValue>("WebSocket", "Disabled"),
} as const;

// One-shot boot banner -------------------------------------------------------
LandFixLog.Info("Tier", `Cocoon tier set resolved: ${JSON.stringify(Tier)}`);

export default Tier;
