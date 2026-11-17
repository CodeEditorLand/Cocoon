/**
 * @module ExtensionHostService
 * @description
 * Manages the lifecycle of extensions.
 * Provides the extension runtime environment (Module interception + API injection).
 */

import { IExtensionHostService } from "../../../Interfaces/I/Extension/Host/Service.js";

import { IModuleInterceptorService } from "../../../Interfaces/I/Module/Interceptor/Service.js";

import { IAPIFactoryService } from "../../API/Factory/Service.js";

import { CocoonDevLog } from "../../Dev/Log.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Hard ceiling (ms) for a single extension load + activate sequence.
 * Mirrors the upstream extHostExtensionService eager-activation guard so a
 * slow or hung extension cannot block the boot of the rest. Kept local (as
 * D7's DEACTIVATION_TIMEOUT_MS is) rather than adding a config subsystem.
 */
export const ACTIVATION_TIMEOUT_MS = 10000;

// Types matching VSCode patterns
interface IExtensionDescription {

	identifier: string;

	extensionLocation: string;

	main?: string;

	activationEvents: string[];
}

interface IExtensionContextShape {

	subscriptions: Array<{ dispose(): unknown }>;

	[Key: string]: unknown;
}

/**
 * Terminal activation state, mirroring the tagged `ExtensionState` union
 * (`_tag: "Error"`) used by the Effect extension service. Kept local so this
 * file owns the typing of the state it marks.
 */
type HostActivationState =
	| { readonly _tag: "Active" }
	| { readonly _tag: "Error"; readonly error: string };

interface ActivatedExtension {

	readonly state: HostActivationState;

	activationTimes: {
		codeLoadingTime: number;

		activateCallTime: number;

		activateResolvedTime: number;
	};

	exports?: any;

	context?: IExtensionContextShape;
}

/**
 * ExtensionHostService implementation
 */
export class ExtensionHostService implements IExtensionHostService {

	readonly _serviceBrand: undefined;

	// Completed extensions (Active or Error)
	private activatedExtensions: Map<string, ActivatedExtension> = new Map();

	// In-flight activations, shared so a second caller never starts a duplicate.
	private activatingExtensions: Map<string, Promise<void>> = new Map();

	constructor(
		private moduleInterceptor: IModuleInterceptorService,

		private apiFactory: IAPIFactoryService,
	) {}

	/**
	 * Activate an extension under a bounded budget.
	 *
	 * A missing id warns and returns; an already-recorded id is idempotent;
	 * an already-activating id shares the in-flight promise instead of
	 * starting a second activation. The load + activate sequence is raced
	 * against ACTIVATION_TIMEOUT_MS and every failure is caught, warned and
	 * marked Error here so boot can continue with the remaining extensions.
	 */
	async activateExtension(
		extensionId: string,

		activationEvent: string,
	): Promise<void> {
		if (typeof extensionId !== "string" || extensionId.length === 0) {
			CocoonDevLog(
				"service",

				"[ExtensionHost] WARN: Activate called without a valid extension id",
			);

			return;
		}

		if (this.activatedExtensions.has(extensionId)) {
			return;
		}

		const inFlight = this.activatingExtensions.get(extensionId);

		if (inFlight !== undefined) {
			CocoonDevLog(
				"service",

				`[ExtensionHost] Activation already in progress for ${extensionId}; sharing in-flight promise`,
			);

			await inFlight;

			return;
		}

		const activation = this._activateWithBudget(extensionId, activationEvent);

		this.activatingExtensions.set(extensionId, activation);

		try {
			// _activateWithBudget settles every path internally: it never rejects.
			await activation;
		} finally {
			this.activatingExtensions.delete(extensionId);
		}
	}

	/**
	 * Race load + activate against the budget. The timer is cleared on the
	 * success, failure and timeout paths in the finally block.
	 */
	private async _activateWithBudget(
		extensionId: string,

		activationEvent: string,
	): Promise<void> {
		let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

		const timedOut = new Promise<"timeout">((resolve) => {
			timeoutHandle = setTimeout(
				() => resolve("timeout"),

				ACTIVATION_TIMEOUT_MS,
			);
		});

		// Shared flag: a late-completing activation must not resurrect an
		// extension the timeout path already marked Error.
		let expired = false;

		const work = this._doActivate(extensionId, activationEvent, () => expired).then(
			() => "complete" as const,

			(error: unknown) => {
				this._markActivationError(extensionId, error);

				return "failed" as const;
			},
		);

		try {
			const outcome = await Promise.race([work, timedOut]);

			if (outcome === "timeout") {
				expired = true;

				const message =
					`Activation of extension '${extensionId}' timed out after ${ACTIVATION_TIMEOUT_MS}ms`;

				CocoonDevLog(
					"service",

					`[ExtensionHost] WARN: ${message}`,
				);

				this._markActivationError(extensionId, message);
			}
		} finally {
			// Clear the timer on every settled path.
			if (timeoutHandle !== undefined) {
				clearTimeout(timeoutHandle);
			}
		}
	}

	/** Mark a failed activation with the tagged Error state and a warning. */
	private _markActivationError(
		extensionId: string,

		error: unknown,
	): void {
		CocoonDevLog(
			"service",

			`[ExtensionHost] WARN: Failed to activate ${extensionId}: ${String(error)}`,
		);

		this.activatedExtensions.set(extensionId, {
			state: { _tag: "Error", error: String(error) },

			activationTimes: {
				codeLoadingTime: 0,

				activateCallTime: 0,

				activateResolvedTime: 0,
			},
		});
	}

	/** Perform the actual load + activate sequence. Rejects on any real failure. */
	private async _doActivate(
		extensionId: string,

		activationEvent: string,

		isExpired: () => boolean,
	): Promise<void> {
		const startTime = Date.now();

		// 1. Prepare API instance for this extension
		const vscodeAPI = this.apiFactory.createAPI();

		// 2. Register with module interceptor
		this.moduleInterceptor.registerAPI(extensionId, vscodeAPI);

		// 3. Mock extension description (In real app, fetch from Registry)
		const extension: IExtensionDescription = {
			identifier: extensionId,

			extensionLocation: `/extensions/${extensionId}`,

			main: "extension.js",

			activationEvents: [activationEvent],
		};

		// 4. Load the extension module
		const moduleLoadStart = Date.now();

		const extensionModule = await this._loadExtensionModule(extension);

		const codeLoadingTime = Date.now() - moduleLoadStart;

		// 5. Activate (context kept so deactivation can dispose
		// everything the extension pushed onto `subscriptions`)
		const activateCallStart = Date.now();

		const context = this._createExtensionContext(extension);

		const exports = await this._callActivate(
			extensionModule,

			extension,

			context,
		);

		const activateCallTime = Date.now() - activateCallStart;

		const activateResolvedTime = Date.now() - startTime;

		// A timed-out activation may finish late; do not overwrite its Error state.
		if (isExpired()) {
			CocoonDevLog(
				"service",

				`[ExtensionHost] ${extensionId} completed after its activation budget expired; keeping Error state`,
			);

			return;
		}

		this.activatedExtensions.set(extensionId, {
			state: { _tag: "Active" },

			activationTimes: {
				codeLoadingTime,

				activateCallTime,

				activateResolvedTime,
			},

			exports,

			context,
		});

		CocoonDevLog(
			"service",

			`[ExtensionHost] ${extensionId} activated successfully in ${activateResolvedTime}ms`,
		);
	}

	/**
	 * Load extension module with advanced interception
	 */
	private async _loadExtensionModule(
		extension: IExtensionDescription,
	): Promise<any> {
		if (!extension.main) {
			// Fallback for no-code extensions (e.g. themes)
			return { activate: () => {} };
		}

		const modulePath = `${extension.extensionLocation}/${extension.main}`;

		CocoonDevLog(
			"service",

			`[ExtensionHost] Loading module: ${modulePath}`,
		);

		// Advanced module loading with security interception
		try {
			// Resolve module path using interceptor
			const resolvedPath = this.moduleInterceptor.resolveModule(
				modulePath,

				extension.extensionLocation,
			);

			// Load module with security interception
			// Note: interceptRequire would be synchronous in Node, but we simulate it here
			const extensionModule = this.moduleInterceptor.interceptRequire(
				resolvedPath,

				extension.extensionLocation,
			);

			return extensionModule;
		} catch (error) {
			CocoonDevLog(
				"service",

				`[ExtensionHost] Failed to load module ${modulePath}: ${String(error)}`,
			);

			// Fallback: If module interceptor fails (e.g. file not found in real FS),
			// we simulate a dummy module for development continuity
			CocoonDevLog(
				"service",

				`[ExtensionHost] Using dummy module for ${extension.identifier}`,
			);

			return {
				activate: (_context: any) => {
					CocoonDevLog(
						"service",

						`[${extension.identifier}] activate() called`,
					);
				},

				deactivate: () => {},
			};
		}
	}

	/**
	 * Create extension context
	 * We use a simplified context here, delegating complex parts to the API Factory if needed
	 */
	private _createExtensionContext(
		extension: IExtensionDescription,
	): IExtensionContextShape {
		return {
			subscriptions: [] as Array<{ dispose(): unknown }>,

			extensionPath: extension.extensionLocation,

			globalState: { get: () => {}, update: () => {} },

			workspaceState: { get: () => {}, update: () => {} },

			secrets: { get: () => {}, store: () => {}, delete: () => {} },
		};
	}

	/**
	 * Call extension's activate function
	 */
	private async _callActivate(
		extensionModule: any,

		_extension: IExtensionDescription,

		context: IExtensionContextShape,
	): Promise<any> {
		if (typeof extensionModule.activate !== "function") {
			// Allow extensions without activate (declarative only)
			return undefined;
		}

		// Call activate function
		return await extensionModule.activate(context);
	}

	/**
	 * Deactivate an extension
	 */
	async deactivateExtension(extensionId: string): Promise<void> {
		const activated = this.activatedExtensions.get(extensionId);

		if (!activated) {
			return;
		}

		CocoonDevLog(
			"service",

			`[ExtensionHost] Deactivating extension: ${extensionId}`,
		);

		// Dispose everything the extension pushed onto
		// `context.subscriptions` (watchers, status-bar items, output
		// channels) so a host reload does not leak them.
		const subscriptions = activated.context?.subscriptions ?? [];

		let disposed = 0;

		for (const subscription of subscriptions) {
			try {
				subscription?.dispose?.();

				disposed++;
			} catch (error) {
				CocoonDevLog(
					"service",

					`[ExtensionHost] Subscription dispose failed for ${extensionId}: ${String(error)}`,
				);
			}
		}

		subscriptions.length = 0;

		CocoonDevLog(
			"service",

			`[ExtensionHost] Disposed ${disposed} subscription(s) for ${extensionId}`,
		);

		this.activatedExtensions.delete(extensionId);
	}
}

/**
 * Service Layer
 */
export const ExtensionHostLayer = async function () {
	const moduleInterceptor = await IModuleInterceptorService;

	const apiFactory = await IAPIFactoryService;

	return new ExtensionHostService(moduleInterceptor, apiFactory);
};
