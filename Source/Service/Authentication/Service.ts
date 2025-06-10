/**
 * @module Service (Authentication)
 * @description Defines the interface and Context.Tag for the Authentication service.
 */

import { Context, Effect, Stream } from "effect";
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
		ProviderId: string,
		Scopes: readonly string[],
		Options: AuthenticationGetSessionOptions,
	) => Effect.Effect<AuthenticationSession | undefined, Error>;

	/**
	 * Lists all available sessions for a given provider.
	 */
	readonly ListSessions: (
		RequestingExtension: Extension,
		ProviderId: string,
		Scopes: readonly string[],
	) => Effect.Effect<readonly AuthenticationSession[], Error>;

	/**
	 * Registers an authentication provider that runs within Cocoon.
	 */
	readonly RegisterAuthenticationProvider: (
		Id: string,
		Label: string,
		Provider: AuthenticationProvider,
		Options?: { supportsMultipleAccounts?: boolean },
	) => Effect.Effect<IDisposable, AuthenticationProviderRegistrationError>;

	/**
	 * An event stream that fires when authentication providers are added or removed.
	 */
	readonly OnDidChangeAuthenticationProvider: Stream.Stream<
		AuthenticationProviderInformation[],
		never
	>;

	/**
	 * An event stream that fires when authentication sessions change.
	 */
	readonly OnDidChangeSession: Stream.Stream<
		AuthenticationSessionsChangeEvent,
		never
	>;
}

export const Tag = Context.Tag<Interface>("Service/Authentication");
