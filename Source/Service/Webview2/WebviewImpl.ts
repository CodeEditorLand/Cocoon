/**
 * @module WebviewImpl
 * @description The concrete implementation of the `vscode.Webview` interface. An
 * instance of this class represents a single webview from the extension host's
 * perspective, proxying state changes to the Mountain host.
 */

import { Effect, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Event, Uri, Webview, WebviewOptions } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { Ipc } from "../Ipc.js";

export class WebviewImpl implements Webview {
	// --- Private State ---
	private IsDisposed = false;
	private _Html = "";
	private _Options: WebviewOptions;

	// --- Event Emitters ---
	private readonly OnDidReceiveMessageEvent = CreateEventStream<any>();
	public readonly onDidReceiveMessage: Event<any> =
		this.OnDidReceiveMessageEvent.Stream.pipe(Stream.toEvent);

	constructor(
		public readonly Handle: string, // A unique ID for this webview instance
		private readonly IpcService: Ipc.Interface,
		private readonly Extension: IExtensionDescription,
		InitialOptions: WebviewOptions,
	) {
		this._Options = InitialOptions;
	}

	// --- Public API Properties ---

	public get html(): string {
		return this._Html;
	}

	public set html(value: string) {
		if (this.IsDisposed || this._Html === value) {
			return;
		}
		this._Html = value;
		// Send a fire-and-forget notification to the host to update the UI.
		const updateEffect = this.IpcService.SendNotification(
			"$setWebviewHtml",
			[this.Handle, value],
		);
		Effect.runFork(updateEffect);
	}

	public get options(): WebviewOptions {
		return this._Options;
	}

	public set options(newOptions: WebviewOptions) {
		if (this.IsDisposed) {
			return;
		}
		this._Options = newOptions;
		const OptionsDto = TypeConverter.Webview.ConvertContentOptionsToDto(
			this.Extension,
			newOptions,
		);
		const updateEffect = this.IpcService.SendNotification(
			"$setWebviewOptions",
			[this.Handle, OptionsDto],
		);
		Effect.runFork(updateEffect);
	}

	public get cspSource(): string {
		// A simplified, common source. A real implementation might get this from the host.
		return "vscode-resource: vscode-webview-resource: https:";
	}

	// --- Public API Methods ---

	public postMessage(message: any): Promise<boolean> {
		if (this.IsDisposed) {
			return Promise.resolve(false);
		}
		const postEffect = this.IpcService.SendRequest<boolean>(
			"$postMessageToWebview",
			[this.Handle, message],
		).pipe(
			Effect.catchAll(() => Effect.succeed(false)), // Return false on any failure
		);
		return Effect.runPromise(postEffect);
	}

	public asWebviewUri(localResource: Uri): Uri {
		// This transforms a local file URI into a special URI that the host
		// can serve securely inside the webview.
		// This logic is typically local to the extension host.
		// Example: file:///path/to/image.png -> vscode-resource://file/path/to/image.png
		return localResource.with({
			scheme: `vscode-resource`,
			authority: localResource.scheme,
			path: localResource.path,
		});
	}

	// --- Internal Methods (called by other services) ---

	/**
	 * Called by the WebviewPanel service when a message is received from the host
	 * for this specific webview instance.
	 */
	public FireDidReceiveMessage(message: any): void {
		if (!this.IsDisposed) {
			this.OnDidReceiveMessageEvent.Fire(message);
		}
	}

	/**
	 * Marks this webview as disposed and cleans up its resources.
	 */
	public Dispose(): void {
		if (!this.IsDisposed) {
			this.IsDisposed = true;
			// You could close the event stream here if the implementation supports it.
		}
	}
}
