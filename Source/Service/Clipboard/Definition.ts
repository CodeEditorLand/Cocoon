/*
 * File: Cocoon/Source/Service/Clipboard/Definition.ts
 * Role: Provides the concrete implementation of the IClipboardService interface.
 * Responsibilities:
 *   - Translates the promise-based VS Code API into declarative Effect workflows.
 *   - Wraps the effects from the Integration layer for clipboard operations.
 *   - Maps low-level integration errors into domain-specific application errors.
 */

import { Effect, Runtime } from "effect";
import type { IClipboardService } from "vs/platform/clipboard/common/clipboardService.js";
import {
	ReadImage,
	ReadResourceList,
	ReadText,
	WriteResourceList,
	WriteText,
	HasResourceList,
} from "Source/Integration/Tauri/Clipboard/Wrapper.js";
import { ApplicationClipboardProblem } from "./Error.js";
import type { IntegrationClipboardProblem } from "Source/Integration/Tauri/Clipboard/Error.js";
import type { Uri } from "Source/Platform/VSCode/Type.js";

/**
 * A higher-order function to execute an `Effect` from the Integration layer and
 * return its result as a `Promise`. This bridges the declarative Effect world
 * with the imperative, promise-based VS Code interface.
 *
 * It also maps the low-level `IntegrationClipboardProblem` into a domain-specific
 * `ApplicationClipboardProblem` for better error tracking.
 *
 * @param IntegrationEffect - The `Effect` to run.
 * @returns A `Promise` that resolves with the success value of the `Effect`.
 */
const RunIntegrationEffect = <SuccessType>(
	IntegrationEffect: Effect.Effect<SuccessType, IntegrationClipboardProblem>,
): Promise<SuccessType> => {
	const MappedEffect = Effect.mapError(
		IntegrationEffect,
		(Cause) => new ApplicationClipboardProblem({ Cause }),
	);
	// The default runtime is used here as this is a boundary layer.
	return Runtime.runPromise(Runtime.defaultRuntime, MappedEffect);
};

/**
 * The concrete class implementing the `IClipboardService`.
 */
class ClipboardServiceImpl implements IClipboardService {
	public readonly _serviceBrand: undefined;

	/**
	 * Triggers a paste operation in the target window. This is a complex UI
	 * interaction and is stubbed for now as it doesn't map directly to a
	 * simple Tauri invoke call.
	 */
	public triggerPaste(_TargetWindowId: number): Promise<void> | undefined {
		return undefined;
	}

	/**
	 * Writes the given text to the system clipboard.
	 * @param Text - The text to write.
	 */
	public writeText(Text: string): Promise<void> {
		return RunIntegrationEffect(WriteText(Text));
	}

	/**
	 * Reads the current text content from the system clipboard.
	 * @returns A promise that resolves to the clipboard text.
	 */
	public readText(): Promise<string> {
		return RunIntegrationEffect(ReadText);
	}

	/**

	 * Reads the text from the dedicated find-widget clipboard.
	 * In this implementation, it falls back to the main system clipboard.
	 */
	public readFindText(): Promise<string> {
		return this.readText();
	}

	/**
	 * Writes text to the dedicated find-widget clipboard.
	 * In this implementation, it falls back to the main system clipboard.
	 * @param Text - The text to write.
	 */
	public writeFindText(Text: string): Promise<void> {
		return this.writeText(Text);
	}

	/**
	 * Writes a list of resource URIs to the clipboard.
	 * @param ResourceList - An array of URIs to write.
	 */
	public writeResources(ResourceList: Uri[]): Promise<void> {
		return RunIntegrationEffect(WriteResourceList(ResourceList));
	}

	/**
	 * Reads a list of resource URIs from the clipboard.
	 * @returns A promise that resolves to an array of URIs.
	 */
	public readResources(): Promise<Uri[]> {
		return RunIntegrationEffect(ReadResourceList);
	}

	/**
	 * Checks if the clipboard contains resource URIs.
	 * @returns A promise that resolves to `true` if resources are present.
	 */
	public hasResources(): Promise<boolean> {
		return RunIntegrationEffect(HasResourceList);
	}

	/**
	 * Reads an image from the clipboard.
	 * @returns A promise that resolves to a `Uint8Array` of the image data.
	 */
	public readImage(): Promise<Uint8Array> {
		return RunIntegrationEffect(ReadImage);
	}
}

/**
 * An `Effect` that creates an instance of the `ClipboardServiceImpl`.
 * This factory pattern allows for dependency injection if the service were to
 * require other services in the future.
 */
const Definition = Effect.sync(() => new ClipboardServiceImpl());

export default Definition;
