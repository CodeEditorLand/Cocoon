/**
 * @module ExtensionChannel
 * @description
 * Server channel implementation for extension host communication.
 * Based on VS Code's ExtensionHostService channel pattern.
 *
 * Architecture Specification: VS Code Extension Host Channel
 * Implementation: Extension lifecycle management via channels
 * Validation: Test with extension activation/deactivation cycles
 */

import { CancellationToken } from "@codeeditorland/output/vscode-dts/vscode";

import { IExtensionHostService } from "../Interfaces/IExtensionHostService";
import { IServerChannel } from "../Interfaces/IIPCService";

/**
 * Extension host channel implementation
 * Specification: src/vs/workbench/api/common/extHostExtensionService.ts
 * Implementation: Extension lifecycle management
 */
export class ExtensionChannel implements IServerChannel<any> {
	constructor(private readonly extensionHostService: IExtensionHostService) {}

	/**
	 * Handle extension-related calls
	 */
	async call<T>(
		ctx: any,
		command: string,
		arg?: any,
		cancellationToken?: CancellationToken,
	): Promise<T> {
		console.log(`[ExtensionChannel] Handling call: ${command}`);

		switch (command) {
			case "activateExtension":
				return (await this.handleActivateExtension(arg)) as T;

			case "deactivateExtension":
				return (await this.handleDeactivateExtension(arg)) as T;

			case "getExtensionExports":
				return (await this.handleGetExtensionExports(arg)) as T;

			case "getExtensionStatus":
				return (await this.handleGetExtensionStatus(arg)) as T;

			default:
				throw new Error(`Unknown command: ${command}`);
		}
	}

	/**
	 * Handle extension activation
	 */
	private async handleActivateExtension(arg: any): Promise<any> {
		const { extensionId, activationEvent } = arg;

		if (!extensionId || !activationEvent) {
			throw new Error("Missing extensionId or activationEvent");
		}

		console.log(`[ExtensionChannel] Activating extension: ${extensionId}`);

		try {
			const activatedExtension =
				await this.extensionHostService.activateExtension(extensionId, {
					startup: true,
					activationEvent,
					extensionId,
				});

			return {
				success: true,
				activationTimes: activatedExtension.activationTimes,
				exports: activatedExtension.exports,
			};
		} catch (error) {
			console.error(
				`[ExtensionChannel] Failed to activate extension ${extensionId}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Handle extension deactivation
	 */
	private async handleDeactivateExtension(arg: any): Promise<any> {
		const { extensionId } = arg;

		if (!extensionId) {
			throw new Error("Missing extensionId");
		}

		console.log(
			`[ExtensionChannel] Deactivating extension: ${extensionId}`,
		);

		try {
			await this.extensionHostService.deactivateExtension(extensionId);

			return {
				success: true,
				extensionId,
			};
		} catch (error) {
			console.error(
				`[ExtensionChannel] Failed to deactivate extension ${extensionId}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Get extension exports
	 */
	private async handleGetExtensionExports(arg: any): Promise<any> {
		const { extensionId } = arg;

		if (!extensionId) {
			throw new Error("Missing extensionId");
		}

		const activatedExtension =
			this.extensionHostService.getActivatedExtension(extensionId);

		if (!activatedExtension) {
			throw new Error(`Extension ${extensionId} not activated`);
		}

		return {
			success: true,
			exports: activatedExtension.exports,
		};
	}

	/**
	 * Get extension status
	 */
	private async handleGetExtensionStatus(arg: any): Promise<any> {
		const { extensionId } = arg;

		if (!extensionId) {
			throw new Error("Missing extensionId");
		}

		const isActivated = this.extensionHostService.isActivated(extensionId);
		const activatedExtension =
			this.extensionHostService.getActivatedExtension(extensionId);

		return {
			success: true,
			activated: isActivated,
			activationTimes: activatedExtension?.activationTimes,
			extensionId,
		};
	}

	/**
	 * Handle extension events
	 */
	listen<T>(ctx: any, event: string, arg?: any): any {
		console.log(`[ExtensionChannel] Listening to event: ${event}`);

		// TODO: Implement event listening
		// Specification: src/vs/workbench/api/common/extHostExtensionService.ts (events)
		// Implementation: Extension lifecycle events

		throw new Error(`Event listening not implemented: ${event}`);
	}
}
