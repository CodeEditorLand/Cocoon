/**
 * @module Definition (Authentication)
 * @description The live implementation of the Authentication service.
 */

import { Context, Effect, Ref } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { AuthenticationProvider } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import AuthenticationProviderExistsError from "./Error/AuthenticationProviderExistsError.js";
import { ConvertSessionToInternal, ConvertSessionToVSCode } from "./Type.js";

export default Effect.gen(function* () {
	const IPC = yield* _(IPCService);
	const Log = yield* _(LogService);
	const LocalProviders = yield* Ref.make(
		new Map<string, AuthenticationProvider>(),
	);

	const OnDidChangeProvidersEvent = CreateEventStream<any>();
	const OnDidChangeSessionsEvent = CreateEventStream<any>();

	const CreateSession = (ProviderID: string, Scopes: readonly string[]) =>
		Effect.gen(function* () {
			const provider = (yield* Ref.get(LocalProviders)).get(ProviderID);
			if (!provider) {
				return yield* Effect.fail(
					new Error(
						`No auth provider with id '${ProviderID}' is registered.`,
					),
				);
			}
			const session = yield* Effect.tryPromise({
				try: () => provider.createSession(Scopes),
				catch: (e) => e as Error,
			});
			return ConvertSessionToInternal(session);
		});

	const RemoveSession = (ProviderID: string, SessionID: string) =>
		Effect.gen(function* () {
			const provider = (yield* Ref.get(LocalProviders)).get(ProviderID);
			if (!provider?.removeSession) {
				return;
			}
			yield* Effect.tryPromise({
				try: () => provider.removeSession!(SessionID),
				catch: (e) => e as Error,
			});
		});

	IPC.RegisterInvokeHandler("$createSession", ([id, scopes]) =>
		CreateSession(id, scopes),
	);
	IPC.RegisterInvokeHandler("$removeSession", ([id, sid]) =>
		RemoveSession(id, sid),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
		GetSession: (extension, providerId, scopes, options) =>
			IPC.SendRequest<any | undefined>("$getSession", [
				extension.id,
				providerId,
				scopes,
				options,
			]).pipe(
				Effect.map((info) =>
					info ? ConvertSessionToVSCode(info) : undefined,
				),
				Effect.tapError((err) =>
					Log.Error(
						`GetSession for provider '${providerId}' failed.`,
						err,
					),
				),
			),

		ListSessions: (extension, providerId, scopes) =>
			IPC.SendRequest<any[]>("$getSessions", [
				extension.id,
				providerId,
				scopes,
			]).pipe(
				Effect.map((infos) => infos.map(ConvertSessionToVSCode)),
				Effect.tapError((err) =>
					Log.Error(
						`ListSessions for provider '${providerId}' failed.`,
						err,
					),
				),
				Effect.catchAll(() => Effect.succeed([])),
			),

		RegisterAuthenticationProvider: (ID, Label, Provider, Option) =>
			Effect.gen(function* () {
				const providers = yield* Ref.get(LocalProviders);
				if (providers.has(ID)) {
					return yield* Effect.fail(
						new AuthenticationProviderExistsError({
							ProviderID: ID,
						}),
					);
				}

				yield* Ref.update(LocalProviders, (map) =>
					map.set(ID, Provider),
				);
				yield* IPC.SendNotification("$registerAuthenticationProvider", [
					ID,
					Label,
					!!Option?.supportsMultipleAccounts,
				]);

				const disposable: IDisposable = {
					dispose: () => {
						Effect.runFork(
							Ref.update(
								LocalProviders,
								(map) => (map.delete(ID), map),
							).pipe(
								Effect.flatMap(() =>
									IPC.SendNotification(
										"$unregisterAuthenticationProvider",
										[ID],
									),
								),
							),
						);
					},
				};
				return disposable;
			}),

		onDidChangeAuthenticationProviders: OnDidChangeProvidersEvent.event,
		onDidChangeSessions: OnDidChangeSessionsEvent.event,
	};

	return ServiceImplementation;
});
