/*---------------------------------------------------------------------------------------------
 * Cocoon Command Shim (shims/commands-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.commands` API (via `IExtHostCommands`) for Cocoon.
 * Based on insights from VS Code's `ExtHostCommands.ts`.
 *
 * Responsibilities (Simplified for Cocoon):
 * - `registerCommand`: Stores command callback locally. Notifies Mountain for global commands.
 * - `executeCommand`: Executes local commands or proxies to Mountain.
 * - Handles RPC calls from Mountain: `$executeContributedCommand`, `$getContributedCommandMetadata`.
 * - Uses BaseCocoonShim for argument marshalling/revival.
 *
 * NOTE: This shim does NOT implement the full `CommandsConverter` or `ApiCommand`
 * system from VS Code's `ExtHostCommands.ts` for simplicity. If that level of
 * argument processing, validation, or API command wrapping is needed, this shim
 * would need significant expansion.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
import { toErrorMessage } from "vs/base/common/errorMessage";
// For error checking
import { ErrorNoTelemetry, isCancellationError } from "vs/base/common/errors";
// For argument processing
import { revive } from "vs/base/common/marshalling";
import { cloneAndChange } from "vs/base/common/objects";
import { URI } from "vs/base/common/uri";
import { IPosition, Position } from "vs/editor/common/core/position";
import { IRange, Range } from "vs/editor/common/core/range";
import { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext,
	ICommandDto,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";

import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
	refineError,
} from "./_baseShim";
// Placeholder
import * as extHostTypeConverter from "./extHostTypeConverters";
// Assuming extHostTypes and extHostTypeConverter are available if we were to implement full conversion
// Placeholder for actual import
import * as extHostTypes from "./extHostTypes";

// --- Type Definitions ---

// Shape for the MainThreadCommands RPC proxy (based on VS Code's ExtHostCommands)
interface MainThreadCommandsShapeForShim {
	$registerCommand(id: string): Promise<void>;

	$unregisterCommand(id: string): Promise<void>;

	$executeCommand(
		id: string,

		args: any | SerializableObjectWithBuffers<any>,

		retry: boolean,
	): Promise<any>;

	// filterUnderscoreCommands is often client-side
	$getCommands(): Promise<string[]>;

	// Not awaited
	$fireCommandActivationEvent(id: string): void;

	// TODO: Add MainThreadTelemetryShape if telemetry reporting is implemented
}

// Shape for this ExtHostCommands service (methods called by Mountain)
interface ExtHostCommandsShapeForShim {
	// args can be SerializableObjectWithBuffers
	$executeContributedCommand(id: string, args: any): Promise<any>;

	$getContributedCommandMetadata(): Promise<{
		[id: string]: ICommandMetadataDtoForShim;
	}>;
}

interface ICommandMetadataDtoForShim extends ICommandMetadata {
	/* Potentially DTO version of ICommandMetadata */
}

interface CommandHandlerShimEntry {
	// (...args: any[]) => any | Promise<any>
	callback: Function;

	thisArg: any;

	// From platform/commands
	metadata?: ICommandMetadata;

	// For context and error reporting
	extension?: IExtensionDescription;
}

// ArgumentProcessor interface from VS Code
export interface ArgumentProcessorShim {
	processArgument(
		arg: any,

		extension: IExtensionDescription | undefined,
	): any;
}

export class ShimExtHostCommands
	extends BaseCocoonShim
	implements ExtHostCommandsShapeForShim
{
	// For IExtHostCommands
	/*, IExtHostCommands (from VS Code) */ public readonly _serviceBrand: undefined;

	readonly #proxy: MainThreadCommandsShapeForShim | null = null;

	readonly #commands = new Map<string, CommandHandlerShimEntry>();

	// TODO: If ApiCommand system is needed, add #apiCommands map and related logic.
	// private readonly _apiCommands = new Map<string, ApiCommand>();

	// TODO: If full argument processing/conversion like VS Code is needed,

	// _argumentProcessors and CommandsConverter would be implemented here.
	// For Cocoon MVP, we rely on BaseCocoonShim's simpler marshalling.
	// private readonly _argumentProcessors: ArgumentProcessorShim[] = [];

	// Would need CommandsConverter class
	// readonly converter: CommandsConverter;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,

		// If telemetry reporting implemented
		// @IExtHostTelemetry extHostTelemetry: IExtHostTelemetry
	) {
		super("ExtHostCommands", rpcService, logService);

		this._log("Initializing...");

		if (this._rpcService) {
			this.#proxy = this._getProxy(
				MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsShapeForShim>,
			);

			// TODO: Initialize MainThreadTelemetry proxy if full telemetry is implemented.
		}

		if (this.#proxy) this._log("MainThreadCommands RPC proxy obtained.");

		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostCommands as ProxyIdentifier<ExtHostCommandsShapeForShim>,

					this,
				);

				this._log(
					"Set local instance for incoming RPC calls (ExtHostContext.ExtHostCommands).",
				);
			} catch (e: any) {
				this._logError("Failed to set local instance for RPC:", e);
			}
		}

		// Initialize argument processors similar to VS Code, if a simplified version is desired.
		// This current shim mostly uses BaseCocoonShim._reviveApiArgument for incoming args.
		// this._argumentProcessors.push({ processArgument(a, _ext) { return revive(a); } });
	}

	public registerCommand(
		// `global` parameter removed as its effect is implicit
		id: string,

		callback: <T>(...args: any[]) => T | Promise<T>,

		thisArg?: any,

		// VS Code uses ICommandMetadata
		metadata?: ICommandMetadata,

		// Context of the registering extension
		extension?: IExtensionDescription,
	): extHostTypes.Disposable {
		// Return vscode.Disposable
		this._logService?.trace("ShimExtHostCommands#registerCommand", id);

		if (!id.trim().length) throw new Error("Command id cannot be empty");

		if (this.#commands.has(id)) {
			// VS Code throws here. For a shim, warning might be acceptable for MVP, but throwing is more correct.
			this._logError(
				`Command '${id}' is already registered. Overwriting can lead to unpredictable behavior.`,
			);

			// throw new Error(`Command '${id}' already exists`);
		}

		this.#commands.set(id, { callback, thisArg, metadata, extension });

		// The `global` parameter from original shim decided this.
		// In VS Code's ExtHostCommands, $registerCommand is always called.
		// The 'global' concept might be for UI visibility, handled by MainThread.
		this.#proxy
			?.$registerCommand(id)
			.catch((e) =>
				this._logError(`$registerCommand RPC for '${id}' failed:`, e),
			);

		return new extHostTypes.Disposable(() => {
			if (this.#commands.delete(id)) {
				this._log(`Command '${id}' registration disposed locally.`);

				this.#proxy?.$unregisterCommand(id).catch((e) =>
					this._logError(
						`$unregisterCommand RPC for '${id}' failed:`,

						e,
					),
				);
			}
		});
	}

	public async executeCommand<T = any>(
		id: string,

		...args: any[]
	): Promise<T> {
		this._logService?.trace(
			"ShimExtHostCommands#executeCommand",

			id,

			args.length,
		);

		return this._doExecuteCommand<T>(id, args, true /* allow retry */);
	}

	private async _doExecuteCommand<T>(
		id: string,

		args: any[],

		retry: boolean,
	): Promise<T> {
		if (this.#commands.has(id)) {
			// Local command
			// Fire and forget activation event
			this.#proxy?.$fireCommandActivationEvent(id);

			return this._executeContributedCommand<T>(
				id,

				args,

				false /* don't annotate error for local proxy */,
			);
		} else {
			// Remote command
			// VS Code's ExtHostCommands does more sophisticated argument conversion here.
			// For Cocoon's shim, we'll rely on BaseCocoonShim's _convertApiArgToInternal.
			// TODO: Re-evaluate if VS Code's specific marshalling (Position, Range, Uri to internal, Buffer wrapping)
			// is necessary for Cocoon's IPC or if BaseCocoonShim's generic approach is sufficient.
			// The original JS shim had its own _convertApiArgToInternal; BaseCocoonShim's is more general.
			let hasBuffers = false;

			const marshalledArgs = args.map((arg) => {
				// Base shim's conversion
				const converted = this._convertApiArgToInternal(arg);

				if (
					converted instanceof VSBuffer ||
					arg instanceof ArrayBuffer ||
					arg instanceof Uint8Array
				) {
					// Signal if VSBuffer or raw buffer types are present
					hasBuffers = true;
				}

				// If VSBuffer is returned by _convertApiArgToInternal, it's fine.
				// If raw ArrayBuffer/Uint8Array are still present, wrap them.
				if (arg instanceof ArrayBuffer)
					return VSBuffer.wrap(new Uint8Array(arg));

				if (arg instanceof Uint8Array) return VSBuffer.wrap(arg);

				return converted;
			});

			const rpcArgs = hasBuffers
				? new SerializableObjectWithBuffers(marshalledArgs)
				: marshalledArgs;

			try {
				const result = await this.#proxy!.$executeCommand(
					id,

					rpcArgs,

					retry,

					// Assert proxy not null
				);

				// Base shim's revival
				return this._reviveApiArgument(result);
			} catch (e: any) {
				if (
					e instanceof Error &&
					e.message === "$executeCommand:retry" &&
					retry
				) {
					this._log(
						`Retrying command '${id}' as requested by main thread.`,
					);

					return this._doExecuteCommand<T>(
						id,

						args,

						false /* no more retries */,
					);
				} else {
					const refined =
						e instanceof Error
							? refineError(
									e,

									this._logService,

									`executeRemoteCmd(${id})`,
								)
							: new Error(String(e));

					this._logError(
						`Error executing remote command '${id}':`,

						refined,
					);

					throw refined;
				}
			}
		}
	}

	private async _executeContributedCommand<T = unknown>(
		id: string,

		args: any[],

		annotateError: boolean,
	): Promise<T> {
		const command = this.#commands.get(id);

		if (!command)
			throw new Error(`Command '${id}' not found locally for execution.`);

		const { callback, thisArg, metadata, extension } = command;

		// TODO: Implement argument validation if metadata.args is present and structured like VS Code's.
		// if (metadata?.args) { ... validate ... }

		try {
			// this._logService?.trace(`Executing command '${id}' from extension '${extension?.identifier.value || 'unknown'}'`);

			return await callback.apply(thisArg, args);
		} catch (err: any) {
			if (!isCancellationError(err)) {
				// Don't log cancellation errors as routine errors
				this._logService?.error(
					`Error during execution of contributed command '${id}':`,

					err,
				);
			}

			if (annotateError && extension?.identifier) {
				// TODO: If full telemetry and error annotation (like CommandError class) is desired:
				// const reported = this.#extHostTelemetry.onExtensionError(extension.identifier, err);

				// throw new CommandErrorWithNameAndSource(id, extension.displayName || extension.name, err);

				// For now, rethrow a refined error or the original.
				throw err instanceof Error
					? refineError(
							err,

							this._logService,

							`localCmdExecAnnotated(${id})`,
						)
					: new Error(String(err));
			}

			// Rethrow original or minimally processed error
			throw err;
		} finally {
			// TODO: Implement telemetry reporting like in VS Code's ExtHostCommands._reportTelemetry
			// if (extension) this._reportTelemetry(command, id, duration);
		}
	}

	// --- RPC Methods called BY Mountain ---
	public async $executeContributedCommand(
		id: string,

		marshalledArgs: any,
	): Promise<any> {
		this._logService?.trace(
			"ShimExtHostCommands#$executeContributedCommand",

			id,
		);

		const cmdHandler = this.#commands.get(id);

		if (!cmdHandler)
			return Promise.reject(
				new Error(`Contributed command '${id}' does not exist.`),
			);

		// Revive arguments. VS Code's version has more complex argument processing here.
		// For Cocoon, rely on BaseCocoonShim's general revival.
		let revivedArgs = this._reviveApiArgument(marshalledArgs);

		if (
			!Array.isArray(revivedArgs) &&
			marshalledArgs !== undefined &&
			marshalledArgs !== null
		) {
			// If single arg was sent not in an array, wrap it
			revivedArgs = [revivedArgs];
		} else if (!Array.isArray(revivedArgs)) {
			// Ensure it's an array for .apply
			revivedArgs = [];
		}

		return this._executeContributedCommand(
			id,

			revivedArgs,

			true /* annotateError for external calls */,
		);
	}

	public async getCommands(
		filterUnderscoreCommands: boolean = false,
	): Promise<string[]> {
		this._logService?.trace(
			"ShimExtHostCommands#getCommands",

			filterUnderscoreCommands,
		);

		const remoteCommands = (await this.#proxy?.$getCommands()) || [];

		const localCommands = Array.from(this.#commands.keys());

		let allCommands = [...new Set([...remoteCommands, ...localCommands])];

		if (filterUnderscoreCommands) {
			allCommands = allCommands.filter(
				(command) => !command.startsWith("_"),
			);
		}

		return allCommands.sort();
	}

	public async $getContributedCommandMetadata(): Promise<{
		[id: string]: ICommandMetadataDtoForShim;
	}> {
		const result: { [id: string]: ICommandMetadataDtoForShim } =
			Object.create(null);

		for (const [id, command] of this.#commands) {
			if (command.metadata) {
				// TODO: Convert ICommandMetadata to ICommandMetadataDto if their structures differ for RPC.
				// Assuming direct compatibility for now
				result[id] = command.metadata as ICommandMetadataDtoForShim;
			}
		}

		return result;
	}

	// TODO: registerArgumentProcessor, registerApiCommand would be needed for full fidelity with VS Code's ExtHostCommands.
	// These are advanced features for framework-level command definition and argument handling.
}
