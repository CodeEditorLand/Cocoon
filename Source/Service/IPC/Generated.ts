/**
 * @module Generated (IPC)
 * @description This module re-exports all the message and client types that are
 * automatically generated from the `vine.proto` file by a tool like `ts-proto`.
 * This provides a single, stable import path for the rest of the application.
 *
 * Note: This file is a placeholder for the actual generated code.
 */

// --- Synthesized Placeholder Types ---
// In a real build, these would be imported from a generated `*.ts` file.

export class Empty {}
export class GenericRequest {
	setRequestid(_id: number) {}
	setMethod(_method: string) {}
	setParams(_params: any) {}
	getRequestid(): number {
		return 0;
	}
	getMethod(): string {
		return "";
	}
	getParams(): any {
		return undefined;
	}
}
export class GenericResponse {
	setRequestid(_id: number) {}
	setResult(_result: any) {}
	getResult(): any {
		return undefined;
	}
}
export class GenericNotification {
	setMethod(_method: string) {}
	setParams(_params: any) {}
}
export class CancelOperationRequest {
	getRequestidtocancel(): number {
		return 0;
	}
}
export class RPCDataPayload {
	setBuffer(_buffer: Uint8Array) {}
	getBuffer_asU8(): Uint8Array {
		return new Uint8Array();
	}
}

export interface MountainService {
	// Define method signatures based on the proto file
	processCocoonRequest(request: GenericRequest): Promise<GenericResponse>;
	sendCocoonNotification(notification: GenericNotification): Promise<Empty>;
	sendRPCDataToMountain(payload: RPCDataPayload): Promise<Empty>;
}

// This is a placeholder constructor
export const MountainServiceClient = function () {} as any as {
	new (address: string, creds: any): MountainService;
};
