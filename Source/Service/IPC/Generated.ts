/*
 * File: Cocoon/Source/Service/IPC/Generated.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:00:34 UTC
 * Export: MountainService
 */

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

class Empty {}
class GenericRequest {
	setRequestid(_ID: number) {}
	setMethod(_Method: string) {}
	setParams(_Parameters: any) {}
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
class GenericResponse {
	setRequestid(_ID: number) {}
	setResult(_Result: any) {}
	getResult(): any {
		return undefined;
	}
}
class GenericNotification {
	setMethod(_Method: string) {}
	setParams(_Parameters: any) {}
}
class CancelOperationRequest {
	getRequestid(): number {
		return 0;
	}
}
class RPCDataPayload {
	setBuffer(_Buffer: Uint8Array) {}
	getBuffer_asU8(): Uint8Array {
		return new Uint8Array();
	}
}

export interface MountainService {
	processCocoonRequest(Request: GenericRequest): Promise<GenericResponse>;
	sendCocoonNotification(Notification: GenericNotification): Promise<Empty>;
	sendRPCDataToMountain(Payload: RPCDataPayload): Promise<Empty>;
}

// This is a placeholder constructor
const MountainServiceClient = (() => {})  as {
	new (Address: string, Credentials: any): MountainService;
};

export default {
	Empty,
	GenericRequest,
	GenericResponse,
	GenericNotification,
	CancelOperationRequest,
	RPCDataPayload,
	MountainServiceClient,
};
