/**
 * @module Handler/VscodeAPI/CommentsNamespace
 * @description
 * Factory for the `vscode.comments` namespace shim. Provides a registry-backed
 * CommentController surface so extensions calling
 * `vscode.comments.createCommentController(id, label)` receive a real
 * controller whose thread mutations persist in-host.
 *
 * Used by: GitHub Pull Requests, GitLens (PR review hover), Gitea PR,
 * code-review extensions. Each calls `controller.createCommentThread(uri,
 * range, comments)` on activation; the stock empty-stub silently dropped
 * the thread metadata, so subsequent reads of `controller` returned a
 * fresh empty object every call.
 *
 * Real comment-pane rendering (gutter "comment available here" markers,
 * inline thread balloons) requires Sky-side `ICommentService` exposure -
 * deferred. This shim keeps the extension's internal thread list coherent
 * so commenting workflows that emit notifications, mutate threads, or
 * track reaction handlers work end-to-end inside the extension host even
 * without UI rendering.
 *
 * ## Architecture
 *
 * Per-controller state lives in `Context.ExtensionRegistry` under
 * `__commentController:<id>`. Each controller owns:
 *
 *   - `threads`  Map<threadKey, CommentThread>   (uri+range-keyed)
 *   - `provider` CommentingRangeProvider | undefined  (extension-set)
 *   - `handler`  ReactionHandler          | undefined  (extension-set)
 *
 * CommentThread state is mutable: extensions update `comments`, `state`,
 * `label`, `collapsibleState` via direct property assignment.
 */

import type { HandlerContext } from "../../Handler/Context.js";

type Comment = {

	body: string | { value: string };

	mode?: number;

	author?: { name: string; iconPath?: unknown };

	contextValue?: string;

	reactions?: readonly unknown[];

	label?: string;

	timestamp?: Date;
};

type CommentThread = {

	uri: unknown;

	range: unknown;

	comments: readonly Comment[];

	collapsibleState: number;

	canReply: boolean;

	contextValue?: string;

	label?: string;

	state?: number;

	dispose(): void;
};

const ThreadKey = (Uri: unknown, Range: unknown): string => {

	const UriStr =
		typeof Uri === "string"
			? Uri
			: ((Uri as { toString?: () => string })?.toString?.() ?? "");

	const R = Range as
		| { start?: { line?: number; character?: number } }
		| undefined;

	const Line = R?.start?.line ?? 0;

	const Char = R?.start?.character ?? 0;

	return `${UriStr}:${Line}:${Char}`;
};

const CreateCommentsNamespace = (Context: HandlerContext) => {
	return {
		createCommentController: (Id: string, Label: string) => {
			const ControllerKey = `__commentController:${Id}`;

			// Idempotent re-registration: dev-reloads call createCommentController
			// twice. Stock VS Code throws on duplicate id; we soften to a no-op
			// returning the existing instance.
			const Existing = Context.ExtensionRegistry.get(ControllerKey);

			if (Existing) {
				return Existing;
			}

			const Threads = new Map<string, CommentThread>();

			const Controller: any = {
				id: Id,

				label: Label,

				commentingRangeProvider: undefined,

				reactionHandler: undefined,

				options: undefined,

				createCommentThread: (
					Uri: unknown,

					Range: unknown,

					Comments: readonly Comment[],
				) => {
					const Key = ThreadKey(Uri, Range);

					const Thread: CommentThread = {
						uri: Uri,

						range: Range,

						comments: Array.isArray(Comments) ? Comments : [],

						collapsibleState: 0,

						canReply: true,

						contextValue: undefined,

						label: undefined,

						state: undefined,

						dispose: () => {
							Threads.delete(Key);
						},
					};

					Threads.set(Key, Thread);

					return Thread;
				},

				dispose: () => {
					for (const Thread of Threads.values()) {
						try {
							Thread.dispose();
						} catch {
							/* swallow per-thread dispose failure */
						}
					}

					Threads.clear();

					Context.ExtensionRegistry.delete(ControllerKey);
				},
			};

			Context.ExtensionRegistry.set(ControllerKey, Controller);

			return Controller;
		},
	};
};

export default CreateCommentsNamespace;
