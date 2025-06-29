/**
 * @module Authentication
 * @description Defines the service for implementing the `vscode.authentication` API.
 * This service handles authentication providers, sessions, and the authentication
 * flows required by extensions, proxying requests to the host.
 */

import { Effect, Ref } from "effect";
import type {
	AuthenticationGetSessionOptions,
	AuthenticationProvider,
	AuthenticationProviderInformation,
	AuthenticationProviderOptions,
	AuthenticationProviderSessionOptions,
	AuthenticationSession,
	AuthenticationSessionsChangeEvent,
	Disposable,
	Event,
} from "vscode";

import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { CreateEventStream } from "./Utility/EventStream.js";

/**
 * @interface Authentication
 * @description The contract for the Authentication service, mirroring `vscode.authentication`.
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
		options: AuthenticationProviderSessionOptions,
	) => Promise<AuthenticationSession>;
	readonly logout: (providerId: string, sessionId: string) => Promise<void>;
}

/**
 * @class AuthenticationService
 * @description The `Effect.Service` for the Authentication service.
 */
export class AuthenticationService extends Effect.Service<AuthenticationService>()(
	"Service/Authentication",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Logger = yield* LoggerService;

			const ProviderInfosReference = yield* Ref.make<
				AuthenticationProviderInformation[]
			>([]);
			const { event: OnDidChangeSessionsEvent } =
				CreateEventStream<AuthenticationSessionsChangeEvent>();

			/**
			 * @description Fetches the list of available authentication providers from the host.
			 * @returns An `Effect` that resolves to an array of provider information.
			 */
			const GetProviderInfos = (): Effect.Effect<
				AuthenticationProviderInformation[],
				Error
			> =>
				IPC.SendRequest<any[]>("$getAuthenticationProviders", []).pipe(
					Effect.map((DataTransferObjects) =>
						DataTransferObjects.map((DTO) => ({
							id: DTO.id,
							label: DTO.label,
						})),
					),
					Effect.tap((Infos) =>
						Ref.set(ProviderInfosReference, Infos),
					),
					Effect.mapError((Cause) => new Error(String(Cause))),
				);

			// Initial fetch of providers, running as a background fiber.
			yield* Effect.forkDaemon(GetProviderInfos());

			/**
			 * @description Requests an authentication session from the host.
			 * @returns An `Effect` that resolves to the session or undefined.
			 */
			const GetSession = (
				ProviderId: string,
				Scopes: readonly string[],
				Options?: AuthenticationGetSessionOptions,
			): Effect.Effect<AuthenticationSession | undefined, Error> =>
				IPC.SendRequest<AuthenticationSession | undefined>(
					"$getSession",
					[ProviderId, Scopes, Options ?? {}],
				).pipe(Effect.mapError((Cause) => new Error(String(Cause))));

			/**
			 * @description Requests the list of accounts for a provider from the host.
			 * @returns An `Effect` that resolves to a readonly array of accounts.
			 */
			const GetAccounts = (
				ProviderId: string,
			): Effect.Effect<readonly { label: string; id: string }[], Error> =>
				IPC.SendRequest<readonly { label: string; id: string }[]>(
					"$getAccounts",
					[ProviderId],
				).pipe(Effect.mapError((Cause) => new Error(String(Cause))));

			const ServiceImplementation: Authentication = {
				getSession: (ProviderId, Scopes, Options) =>
					Effect.runPromise(GetSession(ProviderId, Scopes, Options)),

				getAccounts: (ProviderId) =>
					Effect.runPromise(GetAccounts(ProviderId)),

				onDidChangeSessions: OnDidChangeSessionsEvent,

				registerAuthenticationProvider: (
					_Id: string,
					_Label: string,
					_Provider: AuthenticationProvider,
					_Options?: AuthenticationProviderOptions,
				): Disposable => {
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

				getSessions: (
					ProviderId: string,
					Scopes: readonly string[],
					Options: AuthenticationGetSessionOptions,
				) =>
					// A real implementation would be more nuanced, but for now we can
					// just delegate to a method that might exist on the host.
					Effect.runPromise(
						IPC.SendRequest<AuthenticationSession[]>(
							"$getSessions",
							[ProviderId, Scopes, Options],
						).pipe(
							Effect.mapError(
								(Cause) => new Error(String(Cause)),
							),
						),
					),

				login: (
					ProviderId: string,
					Scopes: readonly string[],
					Options: AuthenticationProviderSessionOptions,
				) =>
					Effect.runPromise(
						IPC.SendRequest<AuthenticationSession>("$login", [
							ProviderId,
							Scopes,
							Options,
						]).pipe(
							Effect.mapError(
								(Cause) => new Error(String(Cause)),
							),
						),
					),

				logout: (ProviderId: string, SessionId: string) =>
					Effect.runPromise(
						IPC.SendNotification("$logout", [
							ProviderId,
							SessionId,
						]).pipe(
							Effect.mapError(
								(Cause) => new Error(String(Cause)),
							),
						),
					),
			};

			return ServiceImplementation;
		}),
	},
) {}
