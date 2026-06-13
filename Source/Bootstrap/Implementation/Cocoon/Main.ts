// ── NodeModuleInterceptor: patch Module._load before ANY extension
// code loads `fs` or `child_process`. Must execute synchronously at
// the top of the bootstrap, before any other import or logic.
//
// Shim tier: active when TierShim ≠ None (Proxy/Replace/Own/Preempt).
// esbuild dead-code-eliminates this import when TierShim=None.
import installNodeModuleInterceptor from "../../../Shim/NodeModuleInterceptor.js";

installNodeModuleInterceptor();

// Import Tier dispatcher *after* __LandTiers is populated.
import "../../../Utility/Tier.js";

import "../../../Debug/Server.js";

import { runBootstrap } from "../../../Service/Bootstrap.js";

// Dual-layer DebugServer (Cocoon half). Activated by the unified
// `DebugServer` env var ("cocoon" | "both"). Safe no-op otherwise.
import { StartWebSocketServer } from "../../WebSocket/Server.js";

// PostHog telemetry - early init so bootstrap errors are captured.
// Dead-code eliminated by esbuild in production (NODE_ENV substitute).
type PostHogBridgeModule =
	typeof import("../../../Telemetry/Post/Hog/Bridge.js");

/**
 * @module CocoonMain
 * @description Main entry for Cocoon extension host.
 * Bootstraps services and starts the host via service-based or Effect-TS architecture.
 */

// ============================================================================
// TIER-GATING BOOTSTRAP - populate __LandTiers before any module that imports
// Utility/Tier.js executes. esbuild substitutes each `__LandTier_*__` via
// the define map in Configuration/ESBuild.
// ============================================================================
declare const __LandTier_RemoteProcedureCall__: string;

declare const __LandTier_HTTPProxy__: string;

declare const __LandTier_Logger__: string;

declare const __LandTier_FileSystem__: string;

declare const __LandTier_FindFiles__: string;

declare const __LandTier_Glob__: string;

declare const __LandTier_FileWatcher__: string;

declare const __LandTier_SchemeAssets__: string;

declare const __LandTier_Configuration__: string;

declare const __LandTier_Diagnostics__: string;

declare const __LandTier_Clipboard__: string;

declare const __LandTier_OpenExternal__: string;

declare const __LandTier_DocumentMirror__: string;

declare const __LandTier_ExtensionActivation__: string;

declare const __LandTier_ExtensionScan__: string;

declare const __LandTier_ModuleCache__: string;

declare const __LandTier_Telemetry__: string;

declare const __LandTier_IPC__: string;

// Per-subsystem routing tiers (added 2026-05-25). Each names where a
// given IPC subsystem's dispatch arms execute: `Mountain` runs the
// native Rust handler; `Node` forwards every call to Cocoon's own
// runtime via gRPC; `Disabled` (TierWebSocket only) turns the boot-time
// listener off; `Process` / `WebWorker` (TierExtensionHost only) pick
// the extension host shape.
declare const __LandTier_Terminal__: string;

declare const __LandTier_SCM__: string;

declare const __LandTier_Debug__: string;

declare const __LandTier_LanguageFeatures__: string;

declare const __LandTier_Search__: string;

declare const __LandTier_OutputChannel__: string;

declare const __LandTier_NativeHost__: string;

declare const __LandTier_TreeView__: string;

declare const __LandTier_Storage__: string;

declare const __LandTier_Model__: string;

declare const __LandTier_Tasks__: string;

declare const __LandTier_Auth__: string;

declare const __LandTier_Encryption__: string;

declare const __LandTier_ExtensionHost__: string;

declare const __LandTier_WebSocket__: string;

(globalThis as { __LandTiers?: Record<string, string> }).__LandTiers = {
	RemoteProcedureCall:
		typeof __LandTier_RemoteProcedureCall__ === "string"
			? __LandTier_RemoteProcedureCall__
			: (process.env["TierRemoteProcedureCall"] ?? "gRPC"),

	HTTPProxy:
		typeof __LandTier_HTTPProxy__ === "string"
			? __LandTier_HTTPProxy__
			: (process.env["TierHTTPProxy"] ?? "HandRolled"),

	Logger:
		typeof __LandTier_Logger__ === "string"
			? __LandTier_Logger__
			: (process.env["TierLogger"] ?? "Standard"),

	FileSystem:
		typeof __LandTier_FileSystem__ === "string"
			? __LandTier_FileSystem__
			: (process.env["TierFileSystem"] ?? "Layer2"),

	FindFiles:
		typeof __LandTier_FindFiles__ === "string"
			? __LandTier_FindFiles__
			: (process.env["TierFindFiles"] ?? "Layer3"),

	Glob:
		typeof __LandTier_Glob__ === "string"
			? __LandTier_Glob__
			: (process.env["TierGlob"] ?? "JavaScript"),

	FileWatcher:
		typeof __LandTier_FileWatcher__ === "string"
			? __LandTier_FileWatcher__
			: (process.env["TierFileWatcher"] ?? "Layer4"),

	SchemeAssets:
		typeof __LandTier_SchemeAssets__ === "string"
			? __LandTier_SchemeAssets__
			: (process.env["TierSchemeAssets"] ?? "Embedded"),

	Configuration:
		typeof __LandTier_Configuration__ === "string"
			? __LandTier_Configuration__
			: (process.env["TierConfiguration"] ?? "Cache"),

	Diagnostics:
		typeof __LandTier_Diagnostics__ === "string"
			? __LandTier_Diagnostics__
			: (process.env["TierDiagnostics"] ?? "Full"),

	Clipboard:
		typeof __LandTier_Clipboard__ === "string"
			? __LandTier_Clipboard__
			: (process.env["TierClipboard"] ?? "Layer3"),

	OpenExternal:
		typeof __LandTier_OpenExternal__ === "string"
			? __LandTier_OpenExternal__
			: (process.env["TierOpenExternal"] ?? "Layer3"),

	DocumentMirror:
		typeof __LandTier_DocumentMirror__ === "string"
			? __LandTier_DocumentMirror__
			: (process.env["TierDocumentMirror"] ?? "Full"),

	ExtensionActivation:
		typeof __LandTier_ExtensionActivation__ === "string"
			? __LandTier_ExtensionActivation__
			: (process.env["TierExtensionActivation"] ?? "Parallel8"),

	ExtensionScan:
		typeof __LandTier_ExtensionScan__ === "string"
			? __LandTier_ExtensionScan__
			: (process.env["TierExtensionScan"] ?? "Sequential"),

	ModuleCache:
		typeof __LandTier_ModuleCache__ === "string"
			? __LandTier_ModuleCache__
			: (process.env["TierModuleCache"] ?? "Simple"),

	Telemetry:
		typeof __LandTier_Telemetry__ === "string"
			? __LandTier_Telemetry__
			: (process.env["TierTelemetry"] ?? "Synchronous"),

	IPC:
		typeof __LandTier_IPC__ === "string"
			? __LandTier_IPC__
			: (process.env["TierIPC"] ?? "Mountain"),

	Terminal:
		typeof __LandTier_Terminal__ === "string"
			? __LandTier_Terminal__
			: (process.env["TierTerminal"] ?? "Mountain"),

	SCM:
		typeof __LandTier_SCM__ === "string"
			? __LandTier_SCM__
			: (process.env["TierSCM"] ?? "Mountain"),

	Debug:
		typeof __LandTier_Debug__ === "string"
			? __LandTier_Debug__
			: (process.env["TierDebug"] ?? "Mountain"),

	LanguageFeatures:
		typeof __LandTier_LanguageFeatures__ === "string"
			? __LandTier_LanguageFeatures__
			: (process.env["TierLanguageFeatures"] ?? "Mountain"),

	Search:
		typeof __LandTier_Search__ === "string"
			? __LandTier_Search__
			: (process.env["TierSearch"] ?? "Mountain"),

	OutputChannel:
		typeof __LandTier_OutputChannel__ === "string"
			? __LandTier_OutputChannel__
			: (process.env["TierOutputChannel"] ?? "Mountain"),

	NativeHost:
		typeof __LandTier_NativeHost__ === "string"
			? __LandTier_NativeHost__
			: (process.env["TierNativeHost"] ?? "Mountain"),

	TreeView:
		typeof __LandTier_TreeView__ === "string"
			? __LandTier_TreeView__
			: (process.env["TierTreeView"] ?? "Mountain"),

	Storage:
		typeof __LandTier_Storage__ === "string"
			? __LandTier_Storage__
			: (process.env["TierStorage"] ?? "Mountain"),

	Model:
		typeof __LandTier_Model__ === "string"
			? __LandTier_Model__
			: (process.env["TierModel"] ?? "Mountain"),

	Tasks:
		typeof __LandTier_Tasks__ === "string"
			? __LandTier_Tasks__
			: (process.env["TierTasks"] ?? "Node"),

	Auth:
		typeof __LandTier_Auth__ === "string"
			? __LandTier_Auth__
			: (process.env["TierAuth"] ?? "Node"),

	Encryption:
		typeof __LandTier_Encryption__ === "string"
			? __LandTier_Encryption__
			: (process.env["TierEncryption"] ?? "Mountain"),

	ExtensionHost:
		typeof __LandTier_ExtensionHost__ === "string"
			? __LandTier_ExtensionHost__
			: (process.env["TierExtensionHost"] ?? "Process"),

	WebSocket:
		typeof __LandTier_WebSocket__ === "string"
			? __LandTier_WebSocket__
			: (process.env["TierWebSocket"] ?? "Disabled"),
};

// Telemetry init gated by esbuild's define - in prod builds the branch
// folds to false and the dynamic import drops from the bundle.
if (process.env["NODE_ENV"] !== "production") {
	const PostHogBridge: PostHogBridgeModule =
		await import("../../../Telemetry/Post/Hog/Bridge.js";

	PostHogBridge.default.Initialize(;

	const _CocoonEntryLoadMillis = Date.now(;

	PostHogBridge.default.CaptureEntryLoad("CocoonMain";

	// setImmediate fires one tick after top-level imports + gRPC server
	// bring-up, acting as a module-loaded signal for the Cocoon Lifecycle funnel.
	setImmediate(() => {
		PostHogBridge.default.CaptureEntryLoaded(
			"CocoonMain",

			Date.now() - _CocoonEntryLoadMillis,
		;
	};
}

const main = async () => {
	try {
		// Parent-death watchdog: when Mountain exits (quit, crash, kill),
		// Cocoon is reparented to launchd (ppid 1) but keeps running and
		// keeps :50052 bound - the NEXT launch's Cocoon then fails to bind
		// and Mountain can end up talking to this stale instance, which
		// makes rebuilds appear to have no effect. Poll ppid and exit when
		// orphaned; unref() so the timer never keeps the process alive.
		const ParentWatch = setInterval(() => {
			if (process.ppid === 1) {
				process.stderr.write(
					"[CocoonMain] Parent (Mountain) exited - shutting down\n",
				;

				process.exit(0;
			}
		}, 5000;

		ParentWatch.unref(;

		const result = await runBootstrap({ debugMode: false };

		// B7-S6: start WebSocket server.
		void StartWebSocketServer().catch(() => {};

		if (!result.success) {
			process.stderr.write(
				"[CocoonMain] Bootstrap partially failed (degraded mode)\n",
			;

			for (const stage of result.stages) {
				if (!stage.success) {
					process.stderr.write(
						"[CocoonMain] Stage failed: " + stage.stageName + "\n",
					;
				}
			}
		} else {
			process.stdout.write(
				"[CocoonMain] Bootstrap completed successfully\n",
			;
		}
	} catch (e) {
		process.stderr.write("[CocoonMain] Fatal: " + String(e) + "\n";

		process.exit(1;
	}
};

main(;
