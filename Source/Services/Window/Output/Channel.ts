/**
 * @module Services/Window/OutputChannel
 * @description
 * Output channel creation for the Window service.
 * Returns a proxy object backed by Mountain gRPC notifications.
 *
 * Source: src/vs/workbench/api/common/extHostOutputService.ts
 */

import { Effect } from "effect";
import type * as VSCode from "vscode";

/**
 * Create an output channel proxy backed by Mountain gRPC notifications.
 *
 * Notifies Mountain to create the output channel (Sky renders it) and returns
 * a proxy that forwards all mutations via fire-and-forget notifications.
 *
 * @param MountainClient - gRPC client with sendNotification support
 * @param Logger - Logger for info output
 * @param Name - Display name for the output channel
 */
export const CreateOutputChannel = (
	MountainClient: {
		sendNotification: (method: string, params: unknown) => Promise<void>;
	},
	Logger: {
		Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
	},
	Name: string,
): Effect.Effect<VSCode.OutputChannel, Error> =>
	Effect.gen(function* () {
		const ChannelId = `output-${crypto.randomUUID()}`;
		yield* Logger.Info(
			`[WindowService] Creating output channel: ${Name} (${ChannelId})`,
		);

		// Notify Mountain to create the output channel (Sky renders it)
		yield* Effect.tryPromise({
			try: () =>
				MountainClient.sendNotification("output.create", {
					id: ChannelId,
					name: Name,
				}),
			catch: () => new Error("Failed to create output channel"),
		});

		// Return output channel proxy forwarding mutations to Mountain
		return yield* Effect.succeed({
			name: Name,
			append(Value: string): void {
				MountainClient.sendNotification("output.append", {
					channel: ChannelId,
					value: Value,
				}).catch(() => {});
			},
			appendLine(Value: string): void {
				MountainClient.sendNotification("output.appendLine", {
					channel: ChannelId,
					value: Value,
				}).catch(() => {});
			},
			clear(): void {
				MountainClient.sendNotification("output.clear", {
					channel: ChannelId,
				}).catch(() => {});
			},
			show(
				_ColumnOrPreserveFocus?: boolean | VSCode.ViewColumn,
				_PreserveFocus?: boolean,
			): void {
				MountainClient.sendNotification("output.show", {
					channel: ChannelId,
				}).catch(() => {});
			},
			hide(): void {
				MountainClient.sendNotification("output.show", {
					channel: ChannelId,
					visible: false,
				}).catch(() => {});
			},
			dispose(): void {
				MountainClient.sendNotification("output.dispose", {
					channel: ChannelId,
				}).catch(() => {});
			},
			replace(_Value: string): void {
				MountainClient.sendNotification("output.replace", {
					channel: ChannelId,
					value: _Value,
				}).catch(() => {});
			},
		} as VSCode.OutputChannel);
	});
