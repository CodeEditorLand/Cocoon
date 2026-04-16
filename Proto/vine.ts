/**
 * @module Proto/vine
 * @description Stub types for Vine proto — used by EchoActionClient.
 * Real types are in Source/Generated/Vine.ts.
 */

export interface EchoAction {
	readonly ActionId: string;
	readonly ActionType: string;
	readonly Payload: unknown;
}

export interface EchoActionResponse {
	readonly ActionId: string;
	readonly Success: boolean;
	readonly Result: unknown;
	readonly Error?: string;
}

export interface RegisterExtensionHostRequest {
	readonly HostId: string;
	readonly ProcessId: number;
}

export interface RegisterExtensionHostResponse {
	readonly Accepted: boolean;
	readonly SessionId: string;
}

export const EchoActionServiceClient: any = class {};
