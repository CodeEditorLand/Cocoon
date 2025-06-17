/*
 * File: Cocoon/Source/Service/Authentication/Service.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:44 UTC
 * Dependency: effect, vs/base/common/lifecycle.js
 * Export: AuthenticationService
 */

/**
 * @module Service (Authentication)
 * @description Defines the interface and Context.Tag for the Authentication service.
 */

import { Context, type Effect } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type {
	AuthenticationGetSessionOptions,
	AuthenticationProvider,
	AuthenticationProviderInformation,
	AuthenticationSession,
	AuthenticationSessionsChangeEvent,
	Event,
	Extension,
} from "vscode";

import type {
	AuthenticationProviderExistsError,
	AuthenticationProviderRegistrationError,
} from "./Error.js";

export default class AuthenticationService extends Context.Tag(
	"Service/Authentication",
)<
	AuthenticationService,
	{
		/**
		 * Requests an authentication session from a provider managed by the host.
		 */
		readonly GetSession: (
			RequestingExtension: Extension<any>,
			ProviderID: string,
			Scopes: readonly string[],
			Options: AuthenticationGetSessionOptions,
		) => Effect.Effect<AuthenticationSession | undefined, Error>;

		/**
		 * Lists all available sessions for a given provider.
		 */
		readonly ListSessions: (
			RequestingExtension: Extension<any>,
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
			Options?: { readonly supportsMultipleAccounts?: boolean },
		) => Effect.Effect<
			IDisposable,
			| AuthenticationProviderRegistrationError
			| AuthenticationProviderExistsError
		>;

		/**
		 * An event that fires when authentication providers are added or removed.
		 */
		readonly onDidChangeAuthenticationProviders: Event<
			readonly AuthenticationProviderInformation[]
		>;

		/**
		 * An event that fires when authentication sessions change.
		 */
		readonly onDidChangeSessions: Event<AuthenticationSessionsChangeEvent>;
	}
>() {}
