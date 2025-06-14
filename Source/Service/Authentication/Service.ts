/**
 * @module Service (Authentication)
 * @description Defines the interface and Context.Tag for the Authentication service.
 */

import { Context, type Effect } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { AuthenticationGetSessionOptions } from "vs/workbench/api/common/extHost.protocol.js";
import type {
	AuthenticationProvider,
	AuthenticationProviderInformation,
	AuthenticationSession,
	AuthenticationSessionsChangeEvent,
	Extension,
} from "vscode";

import type { AuthenticationProviderRegistrationError } from "./Error.js";

export interface Interface {
	/**
	 * Requests an authentication session from a provider managed by the host.
	 */
	readonly GetSession: (
		RequestingExtension: Extension,
		ProviderID: string,
		Scopes: readonly string[],
		Option: AuthenticationGetSessionOptions,
	) => Effect.Effect<AuthenticationSession | undefined, Error>;

	/**
	 * Lists all available sessions for a given provider.
	 */
	readonly ListSessions: (
		RequestingExtension: Extension,
		ProviderID: string,
		Scopes?: readonly string[],
	) => Effect.Effect<readonly AuthenticationSession[], Error>;

	/**
	 * Registers an authentication provider that runs within Cocoon.
	 */
	readonly RegisterAuthenticationProvider: (
		ID: string,
		Label: string,
		Provider: AuthenticationProvider,
		Option?: { supportsMultipleAccounts?: boolean },
	) => Effect.Effect<IDisposable, AuthenticationProviderRegistrationError>;

	/**
	 * An event that fires when authentication providers are added or removed.
	 */
	readonly onDidChangeAuthenticationProviders: VSCode.Event<
		AuthenticationProviderInformation[]
	>;

	/**
	 * An event that fires when authentication sessions change.
	 */
	readonly onDidChangeSessions: VSCode.Event<AuthenticationSessionsChangeEvent>;
}

export const Tag = Context.Tag<Interface>("Service/Authentication");
