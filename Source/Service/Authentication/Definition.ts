/**
 * @module Definition (Authentication)
 * @description The live implementation of the Authentication service.
 */

import { Effect, Ref } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { AuthenticationProvider, AuthenticationSession } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPCProvider } from "../IPC.js";
import { LogProvider } from "../Log.js";
import { AuthenticationProviderExistsError } from "./Error.js";
import type { Interface } from "./Service.js";
import { ConvertInfoToSession, ConvertSessionToInfo } from "./Type.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const Log = yield* _(LogProvider.Tag);
	const LocalProviders = yield* _(
		Ref.make(new Map<string, AuthenticationProvider>()),
	);

	const OnDidChangeProviderEvent = CreateEventStream<any>();
	const OnDidChangeSessionEvent = CreateEventStream<any>();

	// --- RPC Handlers (for calls FROM Mountain) ---
	const $CreateSession = (ProviderId: string, Scopes: readonly string[]) =>
		Effect.gen(function* (_) {
			const provider = (yield* _(Ref.get(LocalProviders))).get(
				ProviderId,
			);
			if (!provider)
				throw new Error(
					`No auth provider with id '${ProviderId}' is registered.`,
				);
			const session = yield* _(
				Effect.tryPromise(() => provider.createSession(Scopes)),
			);
			return ConvertSessionToInfo(session);
		});

	const $RemoveSession = (ProviderId: string, SessionId: string) =>
		Effect.gen(function* (_) {
			const provider = (yield* _(Ref.get(LocalProviders))).get(
				ProviderId,
			);
			if (!provider || !provider.removeSession) return;
			yield* _(
				Effect.tryPromise(() => provider.removeSession!(SessionId)),
			);
		});

	// Register these handlers with the dispatcher.
	IPC.RegisterInvokeHandler("$createSession", ([id, scopes]) =>
		Effect.runPromise($CreateSession(id, scopes)),
	);
	IPC.RegisterInvokeHandler("$removeSession", ([id, sid]) =>
		Effect.runPromise($RemoveSession(id, sid)),
	);
	// TODO: Add handler for '$acceptProvidersChanged' to fire OnDidChangeProviderEvent

	const ServiceImplementation: Interface = {
		GetSession: (ext, providerId, scopes, options) =>
			IPC.SendRequest<any | undefined>("$getSession", [
				ext.id,
				providerId,
				scopes,
				options,
			]).pipe(
				Effect.map((info) =>
					info ? ConvertInfoToSession(info) : undefined,
				),
				Effect.tapError((err) =>
					Log.Error(
						`GetSession for provider '${providerId}' failed.`,
						err,
					),
				),
			),

		ListSessions: (ext, providerId, scopes) =>
			IPC.SendRequest<any[]>("$getSessions", [
				ext.id,
				providerId,
				scopes,
			]).pipe(
				Effect.map((infos) => infos.map(ConvertInfoToSession)),
				Effect.tapError((err) =>
					Log.Error(
						`ListSessions for provider '${providerId}' failed.`,
						err,
					),
				),
				Effect.catchAll(() => Effect.succeed([])), // Return empty array on failure
			),

		RegisterAuthenticationProvider: (Id, Label, Provider, Option) =>
			Effect.gen(function* (_) {
				const providers = yield* _(Ref.get(LocalProviders));
				if (providers.has(Id)) {
					return yield* _(
						Effect.fail(
							new AuthenticationProviderExistsError({
								providerId: Id,
							}),
						),
					);
				}

				yield* _(
					Ref.update(LocalProviders, (map) => map.set(Id, Provider)),
				);
				yield* _(
					IPC.SendNotification("$registerAuthenticationProvider", [
						Id,
						Label,
						!!Option?.supportsMultipleAccounts,
					]),
				);

				const disposable: IDisposable = {
					dispose: () => {
						Effect.runFork(
							Ref.update(
								LocalProviders,
								(map) => (map.delete(Id), map),
							).pipe(
								Effect.flatMap(() =>
									IPC.SendNotification(
										"$unregisterAuthenticationProvider",
										[Id],
									),
								),
							),
						);
					},
				};
				return disposable;
			}),

		OnDidChangeAuthenticationProvider: OnDidChangeProviderEvent.Stream,
		OnDidChangeSession: OnDidChangeSessionEvent.Stream,
	};

	return ServiceImplementation;
});
