/**
 * @module Generated
 * @description Re-exports all the message and client types that are
 * automatically generated from the `vine.ipc.proto` file.
 * This provides a single, stable import path for the rest of the application.
 * NOTE: This file is a placeholder for the actual generated code.
 */
export declare class Empty {
}
export declare class GenericRequest {
    setRequestid(_Id: number): void;
    setMethod(_Method: string): void;
    setParams(_Parameters: any): void;
    getRequestid(): number;
    getMethod(): string;
    getParams(): any;
}
export declare class GenericResponse {
    setRequestid(_Id: number): void;
    setResult(_Result: any): void;
    getResult(): any;
}
export declare class GenericNotification {
    private Method;
    private Parameter;
    setMethod(Method: string): void;
    setParams(Parameters: any): void;
    getMethod(): string;
    getParams(): any;
}
export declare class CancelOperationRequest {
    getRequestid(): number;
}
export declare class RPCDataPayload {
    setBuffer(_Buffer: Uint8Array): void;
    getBuffer(): Uint8Array;
}
export interface MountainService {
    processCocoonRequest(Request: GenericRequest): Promise<GenericResponse>;
    sendCocoonNotification(Notification: GenericNotification): Promise<Empty>;
    sendRPCDataToMountain(Payload: RPCDataPayload): Promise<Empty>;
}
export declare const Proto: {
    Empty: typeof Empty;
    GenericRequest: typeof GenericRequest;
    GenericResponse: typeof GenericResponse;
    GenericNotification: typeof GenericNotification;
    CancelOperationRequest: typeof CancelOperationRequest;
    RPCDataPayload: typeof RPCDataPayload;
};
