/**
 * @module Handler/VscodeAPI/AuthenticationNamespace
 * @description
 * Factory for the vscode.authentication namespace shim. Registers auth
 * providers with Mountain via `register_authentication_provider` and proxies
 * `getSession` calls. Session-change events fire through `Context.Emitter`
 * on the `"auth.didChangeSessions"` channel Mountain emits.
 */

import { NextProviderHandle } from "../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../Handler/Context.js";
import WrapAuthenticationNamespace from "../Wrap/Authentication/Namespace.js";

const EventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(Listener: (...Arguments: any[]) => any) => {
		Context.Emitter.on(EventName, Listener);

		return {
			dispose: () => {
				Context.Emitter.off(EventName, Listener);
			},
		};
	};

const CreateAuthenticationNamespace = (Context: HandlerContext) =>
	WrapAuthenticationNamespace({
		registerAuthenticationProvider: (
			ProviderId: string,

			Label: string,

			Provider: unknown,

			Options?: { supportsMultipleAccounts?: boolean },
		) => {
			const Handle = NextProviderHandle();

			Context.SendToMountain("register_authentication_provider", {
				handle: Handle,
				providerId: ProviderId,
				label: Label,
				supportsMultipleAccounts:
					Options?.supportsMultipleAccounts ?? false,
				extensionId: "",
			}).catch(() => {});

			// Stash so ExtHostAuthentication$getSession can call getSessions().
			const ProviderKey = `__authProvider:${ProviderId}`;

			Context.ExtensionRegistry.set(ProviderKey, Provider);

			// `AuthenticationProvider.onDidChangeSessions` fires with
			// `AuthenticationProviderAuthenticationSessionsChangeEvent`
			// (`{ added, removed, changed }`) when the provider's session
			// set mutates - user logged in / out, token refreshed, account
			// switched. Fan to Cocoon's Emitter so subscribers of
			// `vscode.authentication.onDidChangeSessions` fire with the
			// canonical VS Code event shape:
			//   `{ provider: { id, label }, added, removed, changed }`.
			// Defensive: capture the disposable so unregister can detach
			// the listener and stop leaking references when an extension
			// re-registers a provider with the same id.
			let SessionChangeDisposable: { dispose?: () => void } | null = null;

			try {
				const ProviderEvent = (Provider as any)?.onDidChangeSessions;

				if (typeof ProviderEvent === "function") {
					const Sub = ProviderEvent((Event: any) => {
						try {
							Context.Emitter.emit("auth.didChangeSessions", {
								provider: { id: ProviderId, label: Label },
								added: Array.isArray(Event?.added)
									? Event.added
									: [],
								removed: Array.isArray(Event?.removed)
									? Event.removed
									: [],
								changed: Array.isArray(Event?.changed)
									? Event.changed
									: [],
							});
						} catch {
							/* listener threw - never break the provider */
						}
					});

					if (Sub && typeof Sub.dispose === "function") {
						SessionChangeDisposable = Sub;
					} else if (typeof Sub === "function") {
						SessionChangeDisposable = {
							dispose: Sub as () => void,
						};
					}
				}
			} catch {
				/* provider event surface is optional */
			}

			return {
				dispose: () => {
					try {
						SessionChangeDisposable?.dispose?.();
					} catch {
						/* swallow */
					}

					Context.ExtensionRegistry.delete(ProviderKey);

					Context.SendToMountain(
						"unregister_authentication_provider",

						{
							handle: Handle,
						},
					).catch(() => {});
				},
			};
		},

		getSession: async (
			ProviderId: string,

			Scopes: readonly string[],

			Options?: {
				createIfNone?: boolean;

				clearSessionPreference?: boolean;

				forceNewSession?: boolean | { detail: string };

				silent?: boolean;
			},
		): Promise<unknown> => {
			try {
				// Authentication.GetSession - not yet routed; catch returns undefined.
				return await Context.MountainClient?.sendRequest(
					"Authentication.GetSession",

					[ProviderId, Scopes, Options ?? {}],
				);
			} catch {
				return undefined;
			}
		},

		getAccounts: async (ProviderId: string): Promise<unknown[]> => {
			try {
				// Authentication.GetAccounts - not yet routed; catch returns [].
				const Result = await Context.MountainClient?.sendRequest(
					"Authentication.GetAccounts",

					[ProviderId],
				);

				return Array.isArray(Result) ? Result : [];
			} catch {
				return [];
			}
		},

		onDidChangeSessions: EventSubscriber(Context, "auth.didChangeSessions"),
	});

export default CreateAuthenticationNamespace;
