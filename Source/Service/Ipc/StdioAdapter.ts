/**
 * @module StdioAdapter (IPC)
 * @description Provides an alternative IPC implementation that uses Node.js's
 * standard I/O streams (stdin/stdout) for communication, sending newline-delimited
 * JSON messages. This can be used as a simpler alternative to gRPC for debugging
 * or in environments where gRPC is not suitable.
 */

import * as Readline from "node:readline";
import { Effect, Layer, Ref, Schedule } from "effect";

import { Tag as DispatcherTag } from "../Dispatcher/Service.js";
import { Tag as IpcServiceTag } from "../Service.js";
import { StdioError } from "./Error.js";

interface PendingRequest {
	readonly Resume: (effect: Effect.Effect<any, StdioError>) => void;
	readonly Timeout: NodeJS.Timeout;
}

/**
 * The live implementation Layer for the Stdio-based IPC Provider.
 *
 * This scoped layer sets up listeners on `process.stdin` and provides an
 * `Ipc.Service` implementation that writes JSON messages to `process.stdout`.
 */
export const Live = Layer.scoped(
	IpcServiceTag,
	Effect.gen(function* (_) {
		const Dispatcher = yield* _(DispatcherTag);
		const PendingRequests = yield* _(
			Ref.make(new Map<number, PendingRequest>()),
		);
		const RequestIdCounter = yield* _(Ref.make(1));

		const LineReader = Readline.createInterface({ input: process.stdin });

		const handleLine = (Line: string) =>
			Effect.gen(function* (_) {
				const Message = yield* _(
					Effect.try({
						try: () => JSON.parse(Line),
						catch: (cause) =>
							new StdioError({
								cause,
								context: "JsonParseFailed",
							}),
					}),
				);

				if (Message.id && Message.result !== undefined) {
					// This is a response to a request we sent.
					const MaybeRequest = yield* _(Ref.get(PendingRequests));
					const Pending = MaybeRequest.get(Message.id);
					if (Pending) {
						clearTimeout(Pending.Timeout);
						Pending.Resume(Effect.succeed(Message.result));
						yield* _(
							Ref.update(
								PendingRequests,
								(map) => (map.delete(Message.id), map),
							),
						);
					}
				} else if (Message.method) {
					// This is a notification or request from the host.
					yield* _(
						Dispatcher.DispatchNotification(
							Message.method,
							Message.params,
						),
					);
				}
			}).pipe(
				Effect.catchAll((error) =>
					Effect.logError(
						"Error processing incoming stdio line",
						error,
					),
				),
			);

		LineReader.on("line", (Line) => Effect.runFork(handleLine(Line)));
		yield* _(
			Effect.addFinalizer(() => Effect.sync(() => LineReader.close())),
		);
		yield* _(
			Effect.logInfo(
				"Stdio IPC adapter initialized and listening on stdin.",
			),
		);

		return IpcServiceTag.of({
			SendRequest: (Method, Parameters, TimeoutMs = 30000) =>
				Effect.gen(function* (_) {
					const RequestId = yield* _(
						Ref.getAndUpdate(RequestIdCounter, (n) => n + 1),
					);
					const RequestPayload = {
						type: "request",
						id: RequestId,
						method: Method,
						params: Parameters,
					};

					return yield* _(
						Effect.async<any, StdioError>((resume) => {
							const TimeoutHandle = setTimeout(() => {
								Ref.get(PendingRequests).pipe(
									Effect.flatMap((map) => {
										map.delete(RequestId);
										return Ref.set(PendingRequests, map);
									}),
									Effect.runSync,
								);
								resume(
									Effect.fail(
										new StdioError({
											cause: `Request ${RequestId} timed out`,
											context: "RequestTimeout",
										}),
									),
								);
							}, TimeoutMs);

							Ref.update(
								PendingRequests,
								(map) => (
									map.set(RequestId, {
										Resume: resume,
										Timeout: TimeoutHandle,
									}),
									map
								),
							).pipe(Effect.runSync);

							process.stdout.write(
								JSON.stringify(RequestPayload) + "\n",
							);
						}),
					);
				}),

			SendNotification: (Method, Parameters) =>
				Effect.sync(() => {
					const NotificationPayload = {
						type: "notification",
						method: Method,
						params: Parameters,
					};
					process.stdout.write(
						JSON.stringify(NotificationPayload) + "\n",
					);
				}),

			// Stubs for other Ipc.Service methods not implemented by this adapter
			SendCancel: () => Effect.unit,
			CreateProtocolAdapter: () => {
				throw new Error(
					"RPCProtocol over Stdio is not supported in this adapter.",
				);
			},
			RegisterInvokeHandler: () => ({ dispose: () => {} }),
		});
	}),
);
