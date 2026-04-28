/**
 * @module Services/Window/StatusBar
 * @description
 * Status bar item creation and management for the Window service.
 * Provides a proxy implementation of VSCode.StatusBarItem backed by
 * Mountain gRPC notifications.
 *
 * Source: src/vs/workbench/api/common/extHostWindow.ts (createStatusBarItem)
 */

import { Effect } from "effect";
import type * as VSCode from "vscode";

/**
 * Create a status bar item proxy backed by Mountain gRPC notifications.
 *
 * Creates a local state object for the item and returns a proxy that
 * synchronises mutations to Mountain via fire-and-forget notifications.
 *
 * @param MountainClient - gRPC client with sendNotification support
 * @param GRPCClient - Mountain gRPC client for createStatusBarItem call
 * @param Logger - Logger for info output
 * @param Id - Optional status bar item identifier
 * @param Alignment - Optional alignment (Left or Right)
 * @param Priority - Optional display priority
 */
export const CreateStatusBarItem = (
	MountainClient: {
		sendNotification: (method: string, params: unknown) => Promise<void>;
	},
	GRPCClient: {
		createStatusBarItem: (params: {
			id: string;
			text: string;
			tooltip: string | undefined;
		}) => Effect.Effect<unknown, Error>;
	},
	Logger: { Info: (Message: string) => Effect.Effect<void> },
	Id?: string,
	Alignment?: VSCode.StatusBarAlignment,
	Priority?: number,
): Effect.Effect<VSCode.StatusBarItem, Error> =>
	Effect.gen(function* () {
		const ItemId = Id ?? `statusbar-${crypto.randomUUID()}`;
		yield* Logger.Info(
			`[WindowService] Creating status bar item with id '${ItemId}'`,
		);

		// Track status bar item state locally
		const State = {
			id: ItemId,
			name: undefined as string | undefined,
			text: "",
			tooltip: undefined as string | VSCode.MarkdownString | undefined,
			command: undefined as string | VSCode.Command | undefined,
			alignment: Alignment ?? (1 as VSCode.StatusBarAlignment), // Left = 1
			priority: Priority,
			backgroundColor: undefined as
				| string
				| VSCode.ThemeColor
				| undefined,
			color: undefined as string | VSCode.ThemeColor | undefined,
			isVisible: false,
		};

		// Register the item with Mountain
		yield* GRPCClient.createStatusBarItem({
			id: ItemId,
			text: "",
			tooltip: undefined,
		});

		// Return a status bar item proxy synchronising mutations to Mountain
		return yield* Effect.succeed({
			get id() {
				return State.id;
			},
			get name() {
				return State.name;
			},
			set name(Value: string | undefined) {
				State.name = Value;
			},
			get alignment() {
				return State.alignment;
			},
			get priority() {
				return State.priority;
			},
			get text() {
				return State.text;
			},
			set text(Value: string) {
				State.text = Value;
				MountainClient.sendNotification("setStatusBarText", {
					itemId: ItemId,
					text: Value,
				}).catch(() => {});
			},
			get tooltip() {
				return State.tooltip;
			},
			set tooltip(Value: string | VSCode.MarkdownString | undefined) {
				State.tooltip = Value;
			},
			get command() {
				return State.command;
			},
			set command(Value: string | VSCode.Command | undefined) {
				State.command = Value;
			},
			get backgroundColor() {
				return State.backgroundColor;
			},
			set backgroundColor(Value: string | VSCode.ThemeColor | undefined) {
				State.backgroundColor = Value;
			},
			get color() {
				return State.color;
			},
			set color(Value: string | VSCode.ThemeColor | undefined) {
				State.color = Value;
			},
			show(): void {
				State.isVisible = true;
				MountainClient.sendNotification("setStatusBarText", {
					itemId: ItemId,
					text: State.text,
					visible: true,
				}).catch(() => {});
			},
			hide(): void {
				State.isVisible = false;
				MountainClient.sendNotification("setStatusBarText", {
					itemId: ItemId,
					text: State.text,
					visible: false,
				}).catch(() => {});
			},
			dispose(): void {
				State.isVisible = false;
				MountainClient.sendNotification("disposeStatusBarItem", {
					itemId: ItemId,
				}).catch(() => {});
			},
			accessibilityInformation: undefined,
		} as VSCode.StatusBarItem);
	});
