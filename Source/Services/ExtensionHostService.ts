/**
 * @module ExtensionHostService
 * @description
 * Manages the lifecycle of extensions.
 * Provides the extension runtime environment (Module interception + API injection).
 */

import { Effect, Layer } from "effect";

import { IExtensionHostService } from "../Interfaces/IExtensionHostService.js";
import { IModuleInterceptorService } from "../Interfaces/IModuleInterceptorService.js";
import { IAPIFactoryService } from "../Services/APIFactoryService.js";

// Types matching VSCode patterns
interface IExtensionDescription {
	identifier: string;
	extensionLocation: string;
	main?: string;
	activationEvents: string[];
}

interface ActivatedExtension {
	activationTimes: {
		codeLoadingTime: number;
		activateCallTime: number;
		activateResolvedTime: number;
	};
	exports?: any;
}

/**
 * ExtensionHostService implementation
 */
export class ExtensionHostService implements IExtensionHostService {
	readonly _serviceBrand: undefined;

	// Extensions registry
	private activatedExtensions: Map<string, ActivatedExtension> = new Map();

	constructor(
		private moduleInterceptor: IModuleInterceptorService,
		private apiFactory: IAPIFactoryService,
	) {}

	/**
	 * Activate an extension
	 */
	async activateExtension(
		extensionId: string,
		activationEvent: string,
	): Promise<void> {
		if (this.activatedExtensions.has(extensionId)) {
			return;
		}

		console.log(
			`[ExtensionHost] Activating extension: ${extensionId} (Event: ${activationEvent})`,
		);

		try {
			const startTime = Date.now();

			// 1. Prepare API instance for this extension
			const vscodeAPI = this.apiFactory.createAPI();

			// 2. Register with module interceptor
			// When the extension requires 'vscode', it gets our proxy
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

			// 5. Activate
			const activateCallStart = Date.now();
			const exports = await this._callActivate(
				extensionModule,
				extension,
			);
			const activateCallTime = Date.now() - activateCallStart;
			const activateResolvedTime = Date.now() - startTime;

			this.activatedExtensions.set(extensionId, {
				activationTimes: {
					codeLoadingTime,
					activateCallTime,
					activateResolvedTime,
				},
				exports,
			});

			console.log(
				`[ExtensionHost] ${extensionId} activated successfully in ${activateResolvedTime}ms`,
			);
		} catch (error) {
			console.error(
				`[ExtensionHost] Failed to activate ${extensionId}:`,
				error,
			);
			throw error;
		}
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
		console.log(`[ExtensionHost] Loading module: ${modulePath}`);

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
			console.error(
				`[ExtensionHost] Failed to load module ${modulePath}:`,
				error,
			);

			// Fallback: If module interceptor fails (e.g. file not found in real FS),
			// we simulate a dummy module for development continuity
			console.warn(
				`[ExtensionHost] Using dummy module for ${extension.identifier}`,
			);
			return {
				activate: (_context: any) => {
					console.log(`[${extension.identifier}] activate() called`);
				},
				deactivate: () => {},
			};
		}
	}

	/**
	 * Call extension's activate function
	 */
	private async _callActivate(
		extensionModule: any,
		extension: IExtensionDescription,
	): Promise<any> {
		if (typeof extensionModule.activate !== "function") {
			// Allow extensions without activate (declarative only)
			return undefined;
		}

		// Create extension context
		// We use a simplified context here, delegating complex parts to the API Factory if needed
		const context = {
			subscriptions: [],
			extensionPath: extension.extensionLocation,
			globalState: { get: () => {}, update: () => {} },
			workspaceState: { get: () => {}, update: () => {} },
			secrets: { get: () => {}, store: () => {}, delete: () => {} },
		};

		// Call activate function
		return await extensionModule.activate(context);
	}

	/**
	 * Deactivate an extension
	 */
	async deactivateExtension(extensionId: string): Promise<void> {
		if (!this.activatedExtensions.has(extensionId)) {
			return;
		}
		console.log(`[ExtensionHost] Deactivating extension: ${extensionId}`);
		this.activatedExtensions.delete(extensionId);
	}
}

/**
 * Service Layer
 */
export const ExtensionHostLayer = Layer.effect(
	IExtensionHostService,
	Effect.gen(function* () {
		const moduleInterceptor = yield* IModuleInterceptorService;
		const apiFactory = yield* IAPIFactoryService;
		return new ExtensionHostService(moduleInterceptor, apiFactory);
	}),
);
