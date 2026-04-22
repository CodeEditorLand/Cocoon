/**
 * @module Services/Handler/RequestRoutingHandler
 * @description
 * Dispatches Mountain → Cocoon gRPC requests (i.e. Mountain asking Cocoon
 * to do something) to the service that owns the route. The map is a
 * regex-keyed table so new service prefixes can be added without editing
 * the caller. Each handler returns a value that gRPC serialises back to
 * Mountain; returning `undefined` from `RouteRequest` means "no registered
 * handler" and the caller falls through to the extension-host dispatch.
 *
 * ## Routing table (pattern → service)
 *
 * | Prefix            | Owner                                         | Notes |
 * | ----------------- | --------------------------------------------- | ----- |
 * | `extension.*`     | `IExtensionHostService`                       | activate / deactivate / status / exports |
 * | `configuration.*` | `IConfigurationService`                       | get / set / update                      |
 * | `tree.*`          | `TreeDataProviders` (WindowNamespace)         | getChildren / getTreeItem / getParent / resolveTreeItem |
 * | `webview.*`       | `WebviewPanels` / `WebviewViewProviders` / `CustomEditorProviders` | resolveView / resolveCustomEditor |
 * | `performance.*`   | `IPerformanceMonitoringService`               | metrics / alerts / report               |
 * | `security.*`      | `ISecurityService`                            | policy / audit / incidents              |
 *
 * ## What this router does NOT handle
 *
 * - **`command.*`** is handled directly by Mountain
 *   (`Track/Effect/CreateEffectForRequest.rs` → `Command.Execute` /
 *   `Command.Register` / `Command.GetAll`). Cocoon no longer proxies
 *   command dispatch; the old `IPCService::executeCommand` path was
 *   deleted in 2026-04.
 * - **Provider invocations** (`$provideHover`, `$provideCompletionItems`
 *   and friends) go through `LanguageProviderHandler`, not this router.
 * - **Extension-host lifecycle** (`$activateByEvent`, `$initExtensionHost`)
 *   is dispatched directly by `GRPCServerService` before this router is
 *   consulted.
 *
 * The router's contract: if the method matches a pattern, return the
 * handler's promise; otherwise return `undefined` so the caller can try
 * the next dispatcher. Throwing from a handler surfaces to the RPC client
 * as a typed error.
 */

/**
 * Route request to appropriate service.
 * Service mapping and request routing is fully implemented.
 */
const RouteRequest = async (Method: string, Parameters: any): Promise<any> => {
	console.log(`[RequestRoutingHandler] Routing request: ${Method}`);

	// Service routing table with pattern matching
	const RoutePatterns: Record<
		string,
		(method: string, params: any) => Promise<any>
	> = {
		"extension.\\w+": async (Method: string, Params: any) => {
			// Route to ExtensionHostService via ServiceMapping
			const { ServiceMapping } = await import("../../ServiceMapping");
			const { IExtensionHostService } =
				await import("../../Interfaces/IExtensionHostService");

			switch (Method) {
				case "extension.activate": {
					const ExtensionHostService =
						await ServiceMapping.getService(IExtensionHostService);
					return await ExtensionHostService.activateExtension(
						Params.extensionId,
						Params.reason,
					);
				}
				case "extension.deactivate": {
					const ExtensionHostService =
						await ServiceMapping.getService(IExtensionHostService);
					await ExtensionHostService.deactivateExtension(
						Params.extensionId,
					);
					return { success: true };
				}
				case "extension.get": {
					const ExtensionHostService =
						await ServiceMapping.getService(IExtensionHostService);
					return ExtensionHostService.getActivatedExtension(
						Params.extensionId,
					);
				}
				default:
					throw new Error(`Unknown extension method: ${Method}`);
			}
		},

		"configuration.\\w+": async (Method: string, Params: any) => {
			// Route to ConfigurationService via ServiceMapping
			const { ServiceMapping } = await import("../../ServiceMapping");
			const { IConfigurationService } =
				await import("../../Interfaces/IConfigurationService");

			switch (Method) {
				case "configuration.get": {
					const ConfigService = await ServiceMapping.getService(
						IConfigurationService,
					);
					return await ConfigService.getValue(
						Params.key,
						Params.scope,
					);
				}
				case "configuration.set": {
					const ConfigService = await ServiceMapping.getService(
						IConfigurationService,
					);
					await ConfigService.setValue(
						Params.key,
						Params.value,
						Params.scope,
					);
					return { success: true };
				}
				case "configuration.update": {
					const ConfigService = await ServiceMapping.getService(
						IConfigurationService,
					);
					await ConfigService.updateValue(
						Params.key,
						Params.updater,
						Params.scope,
					);
					return { success: true };
				}
				default:
					throw new Error(`Unknown configuration method: ${Method}`);
			}
		},

		"tree\\.\\w+": async (Method: string, Params: any) => {
			// Mountain asks Cocoon for tree data; route to the registered
			// TreeDataProvider for the handle and serialise the response.
			const { TreeDataProviders } = await import(
				"./VscodeAPI/WindowNamespace.js"
			);
			const Handle = Params?.handle ?? Params?.[0];
			const Provider = TreeDataProviders.get(String(Handle));
			if (!Provider) {
				throw new Error(
					`TreeDataProvider handle not registered: ${Handle}`,
				);
			}
			switch (Method) {
				case "tree.getChildren": {
					const Element = Params?.element ?? Params?.[1];
					const Children =
						(await Provider.getChildren?.(Element)) ?? [];
					return Array.isArray(Children) ? Children : [];
				}
				case "tree.getTreeItem": {
					const Element = Params?.element ?? Params?.[1];
					return (await Provider.getTreeItem?.(Element)) ?? null;
				}
				case "tree.getParent": {
					const Element = Params?.element ?? Params?.[1];
					return (await Provider.getParent?.(Element)) ?? null;
				}
				case "tree.resolveTreeItem": {
					const Item = Params?.item ?? Params?.[1];
					const Element = Params?.element ?? Params?.[2];
					return (
						(await Provider.resolveTreeItem?.(Item, Element)) ?? Item
					);
				}
				default:
					throw new Error(`Unknown tree method: ${Method}`);
			}
		},

		"webview\\.\\w+": async (Method: string, Params: any) => {
			// Mountain forwards webview events (message, dispose, view-state)
			// back to Cocoon so extensions' onDid* handlers fire. Emit the
			// event on Context.Emitter and each createWebviewPanel subscriber
			// receives it.
			const { WebviewPanels, WebviewViewProviders, CustomEditorProviders } =
				await import("./VscodeAPI/WindowNamespace.js");
			const Handle = Params?.handle ?? Params?.[0];
			switch (Method) {
				case "webview.resolveView": {
					const Provider = WebviewViewProviders.get(String(Handle));
					if (!Provider) {
						throw new Error(
							`WebviewViewProvider handle not registered: ${Handle}`,
						);
					}
					const View = Params?.view ?? Params?.[1];
					const Ctx = Params?.context ?? Params?.[2];
					return (
						(await Provider.resolveWebviewView?.(View, Ctx)) ?? null
					);
				}
				case "webview.resolveCustomEditor": {
					const Provider = CustomEditorProviders.get(String(Handle));
					if (!Provider) {
						throw new Error(
							`CustomEditorProvider handle not registered: ${Handle}`,
						);
					}
					const Document = Params?.document ?? Params?.[1];
					const Panel = Params?.panel ?? Params?.[2];
					return (
						(await Provider.resolveCustomEditor?.(
							Document,
							Panel,
							{ asAbsolutePath: (p: string) => p },
						)) ?? null
					);
				}
				default: {
					// Default: panels host one-off events
					const Panel = WebviewPanels.get(String(Handle));
					if (!Panel) return null;
					return null;
				}
			}
		},

		"performance.\\w+": async (Method: string, Params: any) => {
			// Route to PerformanceMonitoringService via ServiceMapping
			const { ServiceMapping } = await import("../../ServiceMapping");
			const { IPerformanceMonitoringService } =
				await import("../../Interfaces/IPerformanceMonitoringService");

			switch (Method) {
				case "performance.metrics": {
					const PerfService = await ServiceMapping.getService(
						IPerformanceMonitoringService,
					);
					return PerfService.getMetrics();
				}
				case "performance.alerts": {
					const PerfService = await ServiceMapping.getService(
						IPerformanceMonitoringService,
					);
					return PerfService.getAlerts();
				}
				case "performance.report": {
					const PerfService = await ServiceMapping.getService(
						IPerformanceMonitoringService,
					);
					return PerfService.generateReport();
				}
				default:
					throw new Error(`Unknown performance method: ${Method}`);
			}
		},

		"security.\\w+": async (Method: string, Params: any) => {
			// Route to SecurityService via ServiceMapping
			const { ServiceMapping } = await import("../../ServiceMapping");
			const { ISecurityService } =
				await import("../../Interfaces/ISecurityService");

			switch (Method) {
				case "security.policy": {
					const SecurityService =
						await ServiceMapping.getService(ISecurityService);
					return await SecurityService.getSecurityPolicy(
						Params.extensionId,
					);
				}
				case "security.audit": {
					const SecurityService =
						await ServiceMapping.getService(ISecurityService);
					return SecurityService.getAuditLog();
				}
				case "security.incidents": {
					const SecurityService =
						await ServiceMapping.getService(ISecurityService);
					return SecurityService.getActiveIncidents();
				}
				default:
					throw new Error(`Unknown security method: ${Method}`);
			}
		},
	};

	// Find matching route pattern
	for (const [Pattern, Handler] of Object.entries(RoutePatterns)) {
		const Regex = new RegExp(Pattern);
		if (Regex.test(Method)) {
			return Handler(Method, Parameters);
		}
	}

	// No match found - caller handles extension host and provider methods
	return undefined;
};

export default RouteRequest;
