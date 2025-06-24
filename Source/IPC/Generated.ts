/**
 * @module Generated
 * @description Re-exports all the message and client types that are
 * automatically generated from the `vine.ipc.proto` file.
 * This provides a single, stable import path for the rest of the application.
 * NOTE: This file is a placeholder for the actual generated code.
 */

class Empty {}

class GenericRequest {
	setRequestid(_Id: number) {}
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
	setRequestid(_Id: number) {}
	setResult(_Result: any) {}
	getResult(): any {
		return undefined;
	}
}

class GenericNotification {
	private Method = "";
	private Parameter: any;
	setMethod(Method: string) {
		this.Method = Method;
	}
	setParams(Parameters: any) {
		this.Parameter = Parameters;
	}
	getMethod(): string {
		return this.Method;
	}
	getParams(): any {
		return this.Parameter;
	}
}

class CancelOperationRequest {
	getRequestid(): number {
		return 0;
	}
}

class RPCDataPayload {
	setBuffer(_Buffer: Uint8Array) {}
	getBuffer(): Uint8Array {
		return new Uint8Array();
	}
}

export interface MountainService {
	processCocoonRequest(Request: GenericRequest): Promise<GenericResponse>;
	sendCocoonNotification(Notification: GenericNotification): Promise<Empty>;
	sendRPCDataToMountain(Payload: RPCDataPayload): Promise<Empty>;
}

export const Proto = {
	Empty,
	GenericRequest,
	GenericResponse,
	GenericNotification,
	CancelOperationRequest,
	RPCDataPayload,
};
