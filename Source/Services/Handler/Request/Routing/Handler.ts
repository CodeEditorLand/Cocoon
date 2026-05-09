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
			const { ServiceMapping } =
				await import("../../../../Service/Mapping.js");

			const { IExtensionHostService } =
				await import("../../../../Interfaces/I/Extension/Host/Service.js");

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
			const { ServiceMapping } =
				await import("../../../../Service/Mapping.js");

			const { IConfigurationService } =
				await import("../../../../Interfaces/I/Configuration/Service.js");

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

		// Mountain → Cocoon tree-children round-trip keyed on `viewId`.
		// Emitted by `Mountain/Source/RPC/CocoonService/TreeView.rs::
		// GetTreeChildren`. Unlike the `tree.*` legacy path that keys on the
		// Cocoon-side `treeDataProvider:N` handle, this variant identifies
		// providers by the same viewId the extension declared in its
		// contributes.views manifest - the only stable key Mountain has.
		"^\\$provideTreeChildren$": async (_Method: string, Params: any) => {
			const { TreeDataProvidersByViewId } =
				await import("../../VscodeAPI/Window/Namespace.js");

			const ViewId = Params?.viewId ?? Params?.[0];

			const ItemHandle = Params?.treeItemHandle ?? Params?.[1] ?? "";

			const Provider = TreeDataProvidersByViewId.get(String(ViewId));

			if (!Provider) {
				return { items: [] };
			}

			// `itemHandle` is the caller-chosen token for an element the
			// provider previously returned; for root calls it is empty.
			// We only have the handle string (Mountain doesn't yet mint
			// structured element objects), so pass undefined for the root
			// and the string otherwise - extensions that round-trip their
			// own handles accept the string opaquely.
			const Element = ItemHandle ? ItemHandle : undefined;
			// Some extensions (e.g. `vscode.references-view`) register a
			// `TreeDataProviderDelegate` eagerly and set the real provider
			// later. Calling `getChildren` before that second step throws
			// `Error: MISSING provider` from inside the delegate's
			// `_assertProvider`. Stock VS Code hides this by only querying
			// the tree once the extension fires its own refresh event -
			// Mountain currently polls unconditionally, so we catch the
			// throw here and return an empty root until the provider is
			// wired up. Still surface non-"MISSING provider" errors so real
			// bugs don't get swallowed.
			let Children: unknown;
			try {
				Children = (await Provider.getChildren?.(Element)) ?? [];
			} catch (Reason) {
				const Message =
					Reason instanceof Error ? Reason.message : String(Reason);
				if (/MISSING provider|provider is not set/i.test(Message)) {
					return { items: [] };
				}
				throw Reason;
			}
			const Items = await Promise.all(
				(Array.isArray(Children) ? Children : []).map(
					async (Child: unknown, Index: number) => {
						const Item =
							(await Provider.getTreeItem?.(Child)) ?? Child;
						const Raw = Item as Record<string, unknown>;
						const Label =
							typeof Raw.label === "string"
								? Raw.label
								: ((Raw.label as { label?: string } | undefined)
										?.label ?? "");
						const IconValue = Raw.iconPath ?? Raw.icon ?? "";
						const Icon =
							typeof IconValue === "string"
								? IconValue
								: ((IconValue as { id?: string } | undefined)
										?.id ?? "");
						// CollapsibleState: 0=None, 1=Collapsed, 2=Expanded.
						// Pass the raw enum numeric through so Sky can
						// faithfully tell "Expanded" from "Collapsed" -
						// previous `isCollapsed: boolean` collapsed
						// Expanded down to "not collapsed" (false) and
						// the workbench tree renderer then treated the
						// item as a leaf. Keep the legacy boolean alongside
						// for any observer that already reads it.
						const CollapsibleState =
							(Raw.collapsibleState as number | undefined) ?? 0;
						// Pass through the rest of the fields the workbench's
						// TreeRenderer reads so GitLens / debug / tasks /
						// NPM tree panes render with full fidelity:
						// - description (trailing grey text after label)
						// - tooltip (hover content)
						// - resourceUri (triggers file-based icon + decoration)
						// - contextValue (drives per-item menu contribution)
						// - command (click handler)
						// - accessibilityInformation (screen reader label)
						const Description =
							typeof Raw.description === "string"
								? Raw.description
								: undefined;
						const Tooltip =
							typeof Raw.tooltip === "string"
								? Raw.tooltip
								: (
										Raw.tooltip as
											| { value?: string }
											| undefined
									)?.value;
						const ResourceUri = Raw.resourceUri;
						const ContextValue =
							typeof Raw.contextValue === "string"
								? Raw.contextValue
								: undefined;
						const Command = Raw.command;
						const AccessibilityInformation =
							Raw.accessibilityInformation;
						return {
							handle: String(
								Raw.id ??
									`${ViewId}/${ItemHandle || "root"}/${Index}`,
							),
							label: Label,
							collapsibleState: CollapsibleState,
							isCollapsed: CollapsibleState === 1,
							icon: String(Icon),
							description: Description,
							tooltip: Tooltip,
							resourceUri: ResourceUri,
							contextValue: ContextValue,
							command: Command,
							accessibilityInformation: AccessibilityInformation,
						};
					},
				),
			);
			return { items: Items };
		},

		"tree\\.\\w+": async (Method: string, Params: any) => {
			// Mountain asks Cocoon for tree data; route to the registered
			// TreeDataProvider for the handle and serialise the response.
			const { TreeDataProviders } =
				await import("../../VscodeAPI/Window/Namespace.js");
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
						(await Provider.resolveTreeItem?.(Item, Element)) ??
						Item
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
			const {
				WebviewPanels,
				WebviewViewProviders,
				WebviewViewBuilders,
				CustomEditorProviders,
			} = await import("../../VscodeAPI/Window/Namespace.js");
			const Handle = Params?.handle ?? Params?.[0];
			switch (Method) {
				case "webview.resolveView": {
					const Provider = WebviewViewProviders.get(String(Handle));
					if (!Provider) {
						// Soft-fail instead of throwing. Throwing here
						// rejects the SkyBridge resolver promise, which
						// surfaces in the workbench as a stuck pane with
						// "Webview is loading" forever - the user clicks,
						// nothing happens, no panel content. Returning
						// null lets the workbench's resolver promise
						// settle so the pane unblocks; the panel will
						// show its empty placeholder until the extension
						// re-registers (typical after a hot-reload). Log
						// the miss so a real bug (truly missing handle
						// vs. transient race) is still triagable.
						try {
							console.warn(
								`[RequestRoutingHandler] webview.resolveView called with unregistered handle=${Handle}; returning null so the workbench resolver settles`,
							);
						} catch {
							/* console may be replaced */
						}
						return null;
					}
					// Build a proxy `WebviewView` so the extension's
					// `resolveWebviewView(view, ctx)` callback can read /
					// set `view.webview.html`, `.postMessage`, etc. and
					// the changes propagate via Mountain notifications
					// to the parked workbench `WebviewView` (registered
					// in `__CEL_WEBVIEW_VIEWS__` by SkyBridge). Caller
					// (Sky bridge or workbench RPC) may also pass an
					// override `view` in Params; honour the override
					// when the caller has already constructed one.
					const Builder = WebviewViewBuilders.get(String(Handle));
					const View =
						Params?.view ?? Params?.[1] ?? Builder?.() ?? {};
					const Ctx = Params?.context ??
						Params?.[2] ?? {
							state: undefined,
						};
					// Stock VS Code passes a `CancellationToken` as the
					// third argument to `WebviewViewProvider.resolveWebviewView(view, context, token)`.
					// Roo, GitLens and Claude all read `token.isCancellationRequested`
					// inside their resolvers; if `token` is `undefined` the
					// access throws `Cannot read properties of undefined`
					// 0-3ms after ENTER and the resolver rejects. Pass a
					// no-op token (never cancels, never fires) so the
					// extension's check is harmless. If the workbench
					// supplies a real token in `Params` we honour it.
					const Token = Params?.token ??
						Params?.[3] ?? {
							isCancellationRequested: false,
							onCancellationRequested: () => ({
								dispose: () => {},
							}),
						};
					try {
						if (process.env["Trace"]) {
							process.stdout.write(
								`[RequestRoutingHandler] webview.resolveView -> Provider.resolveWebviewView ENTER handle=${Handle} hasView=${!!View} hasWebview=${!!View?.webview} hasResolver=${typeof Provider?.resolveWebviewView === "function"}\n`,
							);
						}
						const Result =
							(await Provider.resolveWebviewView?.(
								View,

								Ctx,

								Token,
							)) ?? null;
						if (process.env["Trace"]) {
							process.stdout.write(
								`[RequestRoutingHandler] webview.resolveView -> Provider.resolveWebviewView EXIT handle=${Handle} htmlLen=${String((View as any)?.webview?.html ?? "").length}\n`,
							);
						}
						return Result;
					} catch (ResolveError) {
						// Extension's `resolveWebviewView` threw (Roo,
						// Claude, gitlens, etc. each have their own
						// async setup that can fail on cold boot). Log
						// + return null so the workbench resolver
						// promise still completes - the panel will show
						// the empty placeholder, but the user can retry
						// or reload, instead of being stuck on
						// "Webview is loading" forever. Stock VS Code's
						// `MainThreadWebviewViews.$resolveWebviewView`
						// returns `void` from a try/catch with the same
						// rationale.
						try {
							console.warn(
								`[RequestRoutingHandler] Extension provider.resolveWebviewView threw for handle=${Handle}:`,

								(ResolveError as any)?.message ??
									String(ResolveError),
							);
						} catch {
							/* console may be replaced */
						}

						return null;
					}
				}

				case "webview.resolveCustomEditor": {
					const Provider = CustomEditorProviders.get(String(Handle));

					if (!Provider) {
						// Same soft-fail rationale as `webview.resolveView`
						// above - throwing rejects the workbench-side
						// resolver promise and leaves the editor frame
						// stuck. Returning null lets the editor frame
						// settle (empty content) so the user can retry.
						try {
							console.warn(
								`[RequestRoutingHandler] webview.resolveCustomEditor called with unregistered handle=${Handle}; returning null`,
							);
						} catch {
							/* console may be replaced */
						}

						return null;
					}

					const Document = Params?.document ?? Params?.[1];

					const Panel = Params?.panel ?? Params?.[2];

					// Stock VS Code: `resolveCustomEditor(document, webviewPanel, token)`.
					// The previous third arg `{ asAbsolutePath }` is wrong -
					// that property lives on `ExtensionContext`, not on a
					// `CancellationToken`. Pass a no-op token so any
					// `token.isCancellationRequested` access inside the
					// resolver is harmless.
					const Token = Params?.token ??
						Params?.[3] ?? {
							isCancellationRequested: false,

							onCancellationRequested: () => ({
								dispose: () => {},
							}),
						};

					try {
						return (
							(await Provider.resolveCustomEditor?.(
								Document,

								Panel,

								Token,
							)) ?? null
						);
					} catch (ResolveError) {
						try {
							console.warn(
								`[RequestRoutingHandler] Extension provider.resolveCustomEditor threw for handle=${Handle}:`,

								(ResolveError as any)?.message ??
									String(ResolveError),
							);
						} catch {
							/* console may be replaced */
						}

						return null;
					}
				}

				default: {
					// Default: panels host one-off events
					const Panel = WebviewPanels.get(String(Handle));

					if (!Panel) return null;

					return null;
				}
			}
		},

		"performance.\\w+": async (Method: string, _Params: any) => {
			// Route to PerformanceMonitoringService via ServiceMapping
			const { ServiceMapping } =
				await import("../../../../Service/Mapping.js");

			const { IPerformanceMonitoringService } =
				await import("../../../../Interfaces/I/Performance/Monitoring/Service.js");

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
			const { ServiceMapping } =
				await import("../../../../Service/Mapping.js");

			const { ISecurityService } =
				await import("../../../../Interfaces/I/Security/Service.js");

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

	// Find matching route pattern. Wrap dispatch in PostHog +
	// OTLP capture so the Feature Parity dashboard's
	// `land:cocoon:handler:complete` populates and Jaeger sees
	// per-request spans. Telemetry block is gated by the build-time
	// `process.env.NODE_ENV` substitute - in prod the entire dynamic
	// import + Capture call drops from the bundle, the dispatcher
	// becomes a clean `return await Handler(Method, Parameters)`.
	for (const [Pattern, Handler] of Object.entries(RoutePatterns)) {
		const Regex = new RegExp(Pattern);

		if (Regex.test(Method)) {
			if (process.env["NODE_ENV"] !== "production") {
				const StartMillis = Date.now();

				let Ok = true;

				try {
					return await Handler(Method, Parameters);
				} catch (Error) {
					Ok = false;

					throw Error;
				} finally {
					const DurationMs = Date.now() - StartMillis;

					try {
						const { CaptureHandler } =
							await import("../../../../Telemetry/Post/Hog/Bridge.js");

						CaptureHandler(Method, DurationMs, Ok);
					} catch {
						// Telemetry must not raise into the dispatcher.
					}
				}
			}

			// Production path: no timing, no capture, just dispatch.
			return Handler(Method, Parameters);
		}
	}

	// No match found - caller handles extension host and provider methods
	return undefined;
};

export default RouteRequest;
