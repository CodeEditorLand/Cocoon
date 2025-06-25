/**
 * @module Authentication
 * @description Defines the service for implementing the `vscode.authentication` API.
 * This service handles authentication providers, sessions, and the authentication
 * flows required by extensions, proxying requests to the host.
 */

import { Effect, Ref } from "effect";
import type {
	Event,
	Disposable,
	AuthenticationProvider,
	AuthenticationProviderOptions,
	AuthenticationSession,
	AuthenticationGetSessionOptions,
	AuthenticationProviderInformation,
	AuthenticationSessionsChangeEvent,
} from "vscode";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";

// A simplified, Effect-native implementation that mirrors the necessary
// functionality of IExtHostAuthentication without depending on VS Code's internal classes.

/**
 * @interface Authentication
 * @description The contract for the Authentication service.
 */
export interface Authentication {
	readonly getSession: (
		providerId: string,
		scopes: readonly string[],
		options?: AuthenticationGetSessionOptions,
	) => Promise<AuthenticationSession | undefined>;
	readonly getAccounts: (
		providerId: string,
	) => Promise<readonly { label: string; id: string }[]>;
	readonly onDidChangeSessions: Event<AuthenticationSessionsChangeEvent>;
	readonly registerAuthenticationProvider: (
		id: string,
		label: string,
		provider: AuthenticationProvider,
		options?: AuthenticationProviderOptions,
	) => Disposable;
	readonly getProviderInfos: () => Promise<
		AuthenticationProviderInformation[]
	>;
	readonly getSessions: (
		providerId: string,
		scopes: readonly string[],
		options: AuthenticationGetSessionOptions,
	) => Promise<readonly AuthenticationSession[]>;
	readonly login: (
		providerId: string,
		scopes: readonly string[],
	) => Promise<AuthenticationSession>;
	readonly logout: (providerId: string, sessionId: string) => Promise<void>;
}

/**
 * @class AuthenticationService
 * @description The `Effect.Service` for the Authentication service.
 */
export class AuthenticationService extends Effect.Service<Authentication>()(
	"Service/Authentication",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Logger = yield* LoggerService;

			const ProviderInfosRef = yield* Ref.make<
				AuthenticationProviderInformation[]
			>([]);
			const { event: OnDidChangeSessionsEvent } =
				CreateEventStream<AuthenticationSessionsChangeEvent>();

			const GetProviderInfos = (): Effect.Effect<
				AuthenticationProviderInformation[],
				Error
			> =>
				IPC.SendRequest<any[]>("$getAuthenticationProviders").pipe(
					Effect.map((dtos) =>
						dtos.map((dto) => ({ id: dto.id, label: dto.label })),
					),
					Effect.tap((infos) => Ref.set(ProviderInfosRef, infos)),
					Effect.mapError((cause) => new Error(String(cause))),
				);

			// Initial fetch of providers
			yield* Effect.forkDaemon(GetProviderInfos());

			const GetSession = (
				providerId: string,
				scopes: readonly string[],
				options?: AuthenticationGetSessionOptions,
			): Effect.Effect<AuthenticationSession | undefined, Error> =>
				IPC.SendRequest<AuthenticationSession | undefined>(
					"$getSession",
					[providerId, scopes, options ?? {}],
				).pipe(Effect.mapError((cause) => new Error(String(cause))));

			const GetAccounts = (
				providerId: string,
			): Effect.Effect<readonly { label: string; id: string }[], Error> =>
				IPC.SendRequest<readonly { label: string; id: string }[]>(
					"$getAccounts",
					[providerId],
				).pipe(Effect.mapError((cause) => new Error(String(cause))));

			const Service: Authentication = {
				getSession: (providerId, scopes, options) =>
					Effect.runPromise(GetSession(providerId, scopes, options)),

				getAccounts: (providerId) =>
					Effect.runPromise(GetAccounts(providerId)),

				onDidChangeSessions: OnDidChangeSessionsEvent,

				registerAuthenticationProvider: (
					_id,
					_label,
					_provider,
					_options,
				) => {
					// A real implementation would manage providers and proxy calls.
					// This is stubbed as per the original analysis of OldCocoon.
					Effect.runSync(
						Logger.Debug(
							"STUB: registerAuthenticationProvider called.",
						),
					);
					return { dispose: () => {} };
				},

				getProviderInfos: () => Effect.runPromise(GetProviderInfos()),

				getSessions: (providerId, scopes, options) =>
					// A real implementation would be more nuanced, but for now we can
					// just delegate to a method that might exist on the host.
					Effect.runPromise(
						IPC.SendRequest<AuthenticationSession[]>(
							"$getSessions",
							[providerId, scopes, options],
						).pipe(
							Effect.mapError(
								(cause) => new Error(String(cause)),
							),
						),
					),

				login: (providerId, scopes) =>
					Effect.runPromise(
						IPC.SendRequest<AuthenticationSession>("$login", [
							providerId,
							scopes,
						]).pipe(
							Effect.mapError(
								(cause) => new Error(String(cause)),
							),
						),
					),

				logout: (providerId, sessionId) =>
					Effect.runPromise(
						IPC.SendNotification("$logout", [
							providerId,
							sessionId,
						]).pipe(
							Effect.mapError(
								(cause) => new Error(String(cause)),
							),
						),
					),
			};

			return Service;
		}),
	},
) {}
