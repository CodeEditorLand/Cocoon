/**
 * @module Handler/VscodeAPI/AuthenticationNamespace
 * @description
 * Factory for the vscode.authentication namespace shim. Registers auth
 * providers with Mountain via `register_authentication_provider` and proxies
 * `getSession` calls. Session-change events fire through `Context.Emitter`
 * on the `"auth.didChangeSessions"` channel Mountain emits.
 */

import type { HandlerContext } from "../HandlerContext.js";

let AuthProviderCounter = 0;

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

const CreateAuthenticationNamespace = (Context: HandlerContext) => ({
	registerAuthenticationProvider: (
		ProviderId: string,
		Label: string,
		_Provider: unknown,
		Options?: { supportsMultipleAccounts?: boolean },
	) => {
		const Handle = `authProvider:${++AuthProviderCounter}`;
		Context.SendToMountain("register_authentication_provider", {
			handle: Handle,
			provider_id: ProviderId,
			label: Label,
			supports_multiple_accounts:
				Options?.supportsMultipleAccounts ?? false,
			extension_id: "",
		}).catch(() => {});
		return {
			dispose: () => {
				Context.SendToMountain("unregister_authentication_provider", {
					handle: Handle,
				}).catch(() => {});
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
			// Authentication.GetSession — not yet routed; catch returns undefined.
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
			// Authentication.GetAccounts — not yet routed; catch returns [].
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
