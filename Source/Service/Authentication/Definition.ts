/**
 * @module Definition (Authentication)
 * @description The live implementation of the Authentication service.
 */

import { Effect, Ref, Stream } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { AuthenticationProvider } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { AuthenticationProviderExistsError } from "./Error.js";
import type { Interface } from "./Service.js";
import { ConvertSessionToInternal, ConvertSessionToVSCode } from "./Type.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const LogService = yield* _(Log.Tag);
	const LocalProviders = yield* _(
		Ref.make(new Map<string, AuthenticationProvider>()),
	);

	const OnDidChangeProvidersEvent = CreateEventStream<any>();
	const OnDidChangeSessionsEvent = CreateEventStream<any>();

	// --- RPC Handlers (for calls FROM Mountain) ---
	const CreateSession = (ProviderID: string, Scopes: readonly string[]) =>
		Effect.gen(function* (_) {
			const provider = (yield* _(Ref.get(LocalProviders))).get(
				ProviderID,
			);
			if (!provider) {
				return yield* _(
					Effect.fail(
						new Error(
							`No auth provider with id '${ProviderID}' is registered.`,
						),
					),
				);
			}
			const session = yield* _(
				Effect.tryPromise(() => provider.createSession(Scopes)),
			);
			return ConvertSessionToInternal(session);
		});

	const RemoveSession = (ProviderID: string, SessionID: string) =>
		Effect.gen(function* (_) {
			const provider = (yield* _(Ref.get(LocalProviders))).get(
				ProviderID,
			);
			if (!provider?.removeSession) {
				return;
			}
			yield* _(
				Effect.tryPromise(() => provider.removeSession!(SessionID)),
			);
		});

	// Register these handlers with the dispatcher.
	IPCService.RegisterInvokeHandler("$createSession", ([id, scopes]) =>
		Effect.runPromise(CreateSession(id, scopes)),
	);
	IPCService.RegisterInvokeHandler("$removeSession", ([id, sid]) =>
		Effect.runPromise(RemoveSession(id, sid)),
	);
	// TODO: Add handler for '$acceptProvidersChanged' to fire OnDidChangeProvidersEvent
	// TODO: Add handler for '$acceptSessionsChanged' to fire OnDidChangeSessionsEvent

	const ServiceImplementation: Interface = {
		GetSession: (extension, providerId, scopes, options) =>
			IPCService.SendRequest<any | undefined>("$getSession", [
				extension.id,
				providerId,
				scopes,
				options,
			]).pipe(
				Effect.map((info) =>
					info ? ConvertSessionToVSCode(info) : undefined,
				),
				Effect.tapError((err) =>
					LogService.Error(
						`GetSession for provider '${providerId}' failed.`,
						err,
					),
				),
			),

		ListSessions: (extension, providerId, scopes) =>
			IPCService.SendRequest<any[]>("$getSessions", [
				extension.id,
				providerId,
				scopes,
			]).pipe(
				Effect.map((infos) => infos.map(ConvertSessionToVSCode)),
				Effect.tapError((err) =>
					LogService.Error(
						`ListSessions for provider '${providerId}' failed.`,
						err,
					),
				),
				Effect.catchAll(() => Effect.succeed([])), // Return empty array on failure
			),

		RegisterAuthenticationProvider: (ID, Label, Provider, Option) =>
			Effect.gen(function* (_) {
				const providers = yield* _(Ref.get(LocalProviders));
				if (providers.has(ID)) {
					return yield* _(
						Effect.fail(
							new AuthenticationProviderExistsError({
								ProviderID: ID,
							}),
						),
					);
				}

				yield* _(
					Ref.update(LocalProviders, (map) => map.set(ID, Provider)),
				);
				yield* _(
					IPCService.SendNotification(
						"$registerAuthenticationProvider",
						[ID, Label, !!Option?.supportsMultipleAccounts],
					),
				);

				const disposable: IDisposable = {
					dispose: () => {
						Effect.runFork(
							Ref.update(
								LocalProviders,
								(map) => (map.delete(ID), map),
							).pipe(
								Effect.flatMap(() =>
									IPCService.SendNotification(
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

		onDidChangeAuthenticationProviders:
			OnDidChangeProvidersEvent.Stream.pipe(Stream.toEvent),
		onDidChangeSessions: OnDidChangeSessionsEvent.Stream.pipe(
			Stream.toEvent,
		),
	};

	return ServiceImplementation;
});
