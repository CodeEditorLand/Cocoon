/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/FileSystemWatcher
 * @description
 * Implements `vscode.workspace.createFileSystemWatcher`. Tier-gated:
 * - Tier.FileWatcher !== "Layer4" → true no-op stub (safe at activation time).
 * - Tier.FileWatcher === "Layer4" → registers with Mountain's notify-rs backend
 *   via `FileWatcher.Register`, filtering events by pattern on the Rust side.
 */

import GlobToRegex from "../../../../Utility/GlobToRegex.js";
import Tier from "../../../../Utility/Tier.js";
import { NextProviderHandle } from "../../../LanguageProviderRegistry.js";
import type { HandlerContext } from "../../HandlerContext.js";
import { ExtractGlobPattern, ResolveWorkspaceFolders } from "./Helpers.js";

export const CreateFileSystemWatcher = (
	Context: HandlerContext,
	Pattern: unknown,
	IgnoreCreateEvents?: boolean,
	IgnoreChangeEvents?: boolean,
	IgnoreDeleteEvents?: boolean,
) => {
	const StubDisposable = { dispose: () => {} };
	const StubWatcher = {
		ignoreCreateEvents: IgnoreCreateEvents === true,
		ignoreChangeEvents: IgnoreChangeEvents === true,
		ignoreDeleteEvents: IgnoreDeleteEvents === true,
		onDidCreate: () => StubDisposable,
		onDidChange: () => StubDisposable,
		onDidDelete: () => StubDisposable,
		dispose: () => {},
	};

	if (Tier.FileWatcher !== "Layer4") {
		return StubWatcher;
	}

	const PatternString = ExtractGlobPattern(Pattern);
	if (!PatternString) {
		return StubWatcher;
	}
	const Matcher = GlobToRegex(PatternString);
	const Folders = ResolveWorkspaceFolders(Context);
	const Root =
		(Pattern as any)?.baseUri?.fsPath ??
		(Pattern as any)?.base ??
		Folders[0]?.FsPath;
	if (!Root) {
		return StubWatcher;
	}

	const Handle = NextProviderHandle();
	// `**` anywhere in the pattern forces recursive watching; plain
	// globs restricted to a single directory use NonRecursive so we
	// don't subscribe to the whole tree just to watch one folder.
	const IsRecursive = PatternString.includes("**");
	Context.MountainClient?.sendRequest("FileWatcher.Register", [
		Handle,
		Root,
		IsRecursive,
		PatternString,
	]).catch(() => {});

	const EventName = `fileWatcher:${Handle}`;
	const MakeSubscriber =
		(Kind: "create" | "change" | "delete", Ignore: boolean) =>
		(Listener: (Uri: unknown) => any) => {
			if (Ignore) return StubDisposable;
			const WrappedListener = (Event: { kind: string; path: string }) => {
				if (Event.kind !== Kind) return;
				if (!Matcher.test(Event.path)) return;
				try {
					Listener({
						scheme: "file",
						path: Event.path,
						fsPath: Event.path,
						toString: () => `file://${Event.path}`,
					});
				} catch {}
			};
			Context.Emitter.on(EventName, WrappedListener);
			return {
				dispose: () => {
					Context.Emitter.removeListener(EventName, WrappedListener);
				},
			};
		};

	return {
		ignoreCreateEvents: IgnoreCreateEvents === true,
		ignoreChangeEvents: IgnoreChangeEvents === true,
		ignoreDeleteEvents: IgnoreDeleteEvents === true,
		onDidCreate: MakeSubscriber("create", IgnoreCreateEvents === true),
		onDidChange: MakeSubscriber("change", IgnoreChangeEvents === true),
		onDidDelete: MakeSubscriber("delete", IgnoreDeleteEvents === true),
		dispose: () => {
			Context.Emitter.removeAllListeners(EventName);
			Context.MountainClient?.sendRequest("FileWatcher.Unregister", [
				Handle,
			]).catch(() => {});
		},
	};
};
