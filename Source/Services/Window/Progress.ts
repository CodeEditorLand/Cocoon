/**
 * @module Services/Window/Progress
 * @description
 * Progress indicator implementation for the Window service.
 * Shows a progress UI in Mountain while running an async task.
 *
 * Source: src/vs/workbench/api/common/extHostProgressService.ts
 */

import { Effect } from "effect";
import type * as VSCode from "vscode";

/**
 * Show a progress indicator while running a task.
 *
 * Sends start/complete notifications to Mountain and provides the task with
 * a progress reporter and a cancellation token. The task result is returned
 * after the progress indicator is dismissed.
 *
 * @param MountainClient - gRPC client with sendNotification support
 * @param Logger - Logger for info output
 * @param Options - Progress options (location, title, cancellable)
 * @param Task - Async task receiving a progress reporter and cancellation token
 */
export const WithProgress = <T>(
	MountainClient: {
		sendNotification: (method: string, params: unknown) => Promise<void>;
	},
	Logger: {
		Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
	},
	Options: VSCode.ProgressOptions,
	Task: (
		Progress: VSCode.Progress<{ message?: string; increment?: number }>,
		Token: VSCode.CancellationToken,
	) => Promise<T>,
): Effect.Effect<T, Error> =>
	Effect.gen(function* () {
		const ProgressId = `progress-${crypto.randomUUID()}`;
		yield* Logger.Info(
			`[WindowService] Starting progress: ${Options.location} (${ProgressId})`,
		);

		// Create a minimal cancellation token (cancellation via Mountain is a future TODO)
		const CancellationToken: VSCode.CancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: (_Listener: () => any): any => ({
				dispose: () => {},
			}),
		};

		// Create a progress reporter forwarding updates to Mountain
		const ProgressReporter: VSCode.Progress<{
			message?: string;
			increment?: number;
		}> = {
			report(Value: { message?: string; increment?: number }): void {
				MountainClient.sendNotification("progress.update", {
					id: ProgressId,
					message: Value.message,
					increment: Value.increment,
				}).catch(() => {});
			},
		};

		// Notify Mountain to show the progress indicator
		yield* Effect.tryPromise({
			try: () =>
				MountainClient.sendNotification("progress.start", {
					id: ProgressId,
					location: Options.location,
					title: Options.title,
					cancellable: Options.cancellable ?? false,
				}),
			catch: () => new Error("Failed to start progress"),
		});

		// Execute the task
		const Result = yield* Effect.tryPromise({
			try: () => Task(ProgressReporter, CancellationToken),
			catch: (Error_) => {
				throw new Error(
					`Progress task failed: ${(Error_ as Error).message}`,
				);
			},
		});

		// Notify Mountain to dismiss the progress indicator
		yield* Effect.tryPromise({
			try: () =>
				MountainClient.sendNotification("progress.complete", {
					id: ProgressId,
				}),
			catch: () => new Error("Failed to complete progress"),
		});

		return Result;
	});
