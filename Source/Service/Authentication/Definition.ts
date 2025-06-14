/**
 * @module Definition (Authentication)
 * @description The live implementation of the Authentication service.
 */

import { Effect, Ref } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { AuthenticationProvider } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import { AuthenticationProviderExistsError } from "./Error.js";
import type Service from "./Service.js";
import { ConvertSessionToInternal, ConvertSessionToVSCode } from "./Type.js";

/**
 * An Effect that builds the live implementation of the Authentication service.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Log = yield* LogService;
	const LocalProviders = yield* Ref.make(
		new Map<string, AuthenticationProvider>(),
	);

	const OnDidChangeProvidersEvent = CreateEventStream<any>();
	const OnDidChangeSessionsEvent = CreateEventStream<any>();

	// --- RPC Handlers ---
	const CreateSession = (ProviderID: string, Scopes: readonly string[]) =>
		Effect.gen(function* () {
			const Provider = (yield* Ref.get(LocalProviders)).get(ProviderID);
			if (!Provider) {
				return yield* Effect.fail(
					new Error(
						`No auth provider with id '${ProviderID}' is registered.`,
					),
				);
			}
			const Session = yield* Effect.tryPromise({
				try: () => Provider.createSession(Scopes),
				catch: (CaughtError) => CaughtError as Error,
			});
			return ConvertSessionToInternal(Session);
		});

	const RemoveSession = (ProviderID: string, SessionID: string) =>
		Effect.gen(function* () {
			const Provider = (yield* Ref.get(LocalProviders)).get(ProviderID);
			if (!Provider?.removeSession) {
				return;
			}
			yield* Effect.tryPromise({
				try: () => Provider.removeSession!(SessionID),
				catch: (CaughtError) => CaughtError as Error,
			});
		});

	IPC.RegisterInvokeHandler("$createSession", ([ID, Scopes]) =>
		Effect.runPromise(CreateSession(ID, Scopes)),
	);
	IPC.RegisterInvokeHandler("$removeSession", ([ID, SessionID]) =>
		Effect.runPromise(RemoveSession(ID, SessionID)),
	);

	// --- Service Implementation ---
	const AuthenticationImplementation: Service = {
		GetSession: (RequestingExtension, ProviderID, Scopes, Options) =>
			IPC.SendRequest<any | undefined>("$getSession", [
				RequestingExtension.id,
				ProviderID,
				Scopes,
				Options,
			]).pipe(
				Effect.map((Info) =>
					Info ? ConvertSessionToVSCode(Info) : undefined,
				),
				Effect.tapError((Error) =>
					Log.Error(
						`GetSession for provider '${ProviderID}' failed.`,
						Error,
					),
				),
			),

		ListSessions: (RequestingExtension, ProviderID, Scopes) =>
			IPC.SendRequest<any[]>("$getSessions", [
				RequestingExtension.id,
				ProviderID,
				Scopes,
			]).pipe(
				Effect.map((Infos) => Infos.map(ConvertSessionToVSCode)),
				Effect.tapError((Error) =>
					Log.Error(
						`ListSessions for provider '${ProviderID}' failed.`,
						Error,
					),
				),
				Effect.catchAll(() => Effect.succeed([])),
			),

		RegisterAuthenticationProvider: (ID, Label, Provider, Options) =>
			Effect.gen(function* () {
				const Providers = yield* Ref.get(LocalProviders);
				if (Providers.has(ID)) {
					return yield* new AuthenticationProviderExistsError({
						ProviderID: ID,
					});
				}

				yield* Ref.update(LocalProviders, (Map) =>
					Map.set(ID, Provider),
				);
				yield* IPC.SendNotification("$registerAuthenticationProvider", [
					ID,
					Label,
					!!Options?.supportsMultipleAccounts,
				]);

				const Disposable: IDisposable = {
					dispose: () => {
						const CleanupEffect = Ref.update(
							LocalProviders,
							(Map) => (Map.delete(ID), Map),
						).pipe(
							Effect.flatMap(() =>
								IPC.SendNotification(
									"$unregisterAuthenticationProvider",
									[ID],
								),
							),
						);
						Effect.runFork(CleanupEffect);
					},
				};
				return Disposable;
			}),

		onDidChangeAuthenticationProviders: OnDidChangeProvidersEvent.event,
		onDidChangeSessions: OnDidChangeSessionsEvent.event,
	};

	return AuthenticationImplementation;
});
