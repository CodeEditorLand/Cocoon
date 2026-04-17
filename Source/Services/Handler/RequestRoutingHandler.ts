/**
 * @module Handler/RequestRoutingHandler
 * @description
 * Routes Mountain gRPC requests to appropriate Cocoon services.
 * Handles the service routing table with pattern matching for:
 * - extension.* — ExtensionHostService
 * - configuration.* — ConfigurationService
 * - command.* — IPCService (command registry)
 * - performance.* — PerformanceMonitoringService
 * - security.* — SecurityService
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

		"command.\\w+": async (Method: string, Params: any) => {
			// Route to CommandService via ServiceMapping
			const { ServiceMapping } = await import("../../ServiceMapping");
			const { IIPCService } =
				await import("../../Interfaces/IIPCService");

			switch (Method) {
				case "command.execute": {
					const IpcService =
						await ServiceMapping.getService(IIPCService);
					return await IpcService.executeCommand(
						Params.commandId,
						...(Params.args || []),
					);
				}
				case "command.register": {
					const IpcService =
						await ServiceMapping.getService(IIPCService);
					const Disposable = await IpcService.registerCommand(
						Params.commandId,
						Params.callback,
					);
					return { disposableId: "command-registration" };
				}
				case "command.get": {
					const IpcService =
						await ServiceMapping.getService(IIPCService);
					return await IpcService.getCommands();
				}
				default:
					throw new Error(`Unknown command method: ${Method}`);
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

	// No match found — caller handles extension host and provider methods
	return undefined;
};

export default RouteRequest;
