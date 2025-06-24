/*
 * File: Cocoon/Source/Service/Clipboard/Service.ts
 * Role: Defines the Clipboard service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for the Clipboard service, conforming to `IClipboardService`.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, Runtime } from "effect";
import type { IClipboardService } from "vs/platform/clipboard/common/clipboardService.js";
import type { Uri } from "Source/Platform/VSCode/Type.js";
import { ApplicationClipboardProblem } from "./Error.js";
// Assumed imports from your Integration layer
import type { IntegrationClipboardProblem } from "Source/Integration/Tauri/Clipboard/Error.js";
import {
	ReadImage,
	ReadResourceList,
	ReadText,
	WriteResourceList,
	WriteText,
	HasResourceList,
} from "Source/Integration/Tauri/Clipboard/Wrapper.js";

// Internal helper to bridge the declarative Effect world with the imperative, promise-based VS Code interface.
const RunIntegrationEffect = <SuccessType>(
	IntegrationEffect: Effect.Effect<SuccessType, IntegrationClipboardProblem>,
): Promise<SuccessType> => {
	const MappedEffect = Effect.mapError(
		IntegrationEffect,
		(Cause) => new ApplicationClipboardProblem({ Cause }),
	);
	// The default runtime is used here as this is an API boundary.
	return Runtime.runPromise(Runtime.defaultRuntime, MappedEffect);
};

export class Clipboard extends Effect.Service<IClipboardService>()(
	"vscode/ClipboardService",
	{
		// A sync constructor is used as it's just creating an object that holds methods.
		// The methods themselves will run effects and return promises.
		sync: () => ({
			_serviceBrand: undefined,

			triggerPaste: (
				_TargetWindowId: number,
			): Promise<void> | undefined => {
				// Stubbed as per original.
				return undefined;
			},

			writeText: (Text: string): Promise<void> => {
				return RunIntegrationEffect(WriteText(Text));
			},

			readText: (): Promise<string> => {
				return RunIntegrationEffect(ReadText);
			},

			readFindText: function (): Promise<string> {
				return this.readText();
			},

			writeFindText: function (Text: string): Promise<void> {
				return this.writeText(Text);
			},

			writeResources: (ResourceList: Uri[]): Promise<void> => {
				return RunIntegrationEffect(WriteResourceList(ResourceList));
			},

			readResources: (): Promise<Uri[]> => {
				return RunIntegrationEffect(ReadResourceList);
			},

			hasResources: (): Promise<boolean> => {
				return RunIntegrationEffect(HasResourceList);
			},

			readImage: (): Promise<Uint8Array> => {
				return RunIntegrationEffect(ReadImage);
			},
		}),
	},
) {}
