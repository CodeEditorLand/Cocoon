// package: vine_ipc
// file: Vine.proto

import * as jspb from "google-protobuf";

export class Empty extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Empty.AsObject;
  static toObject(includeInstance: boolean, msg: Empty): Empty.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Empty, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Empty;
  static deserializeBinaryFromReader(message: Empty, reader: jspb.BinaryReader): Empty;
}

export namespace Empty {
  export type AsObject = {
  }
}

export class GenericRequest extends jspb.Message {
  getRequestidentifier(): number;
  setRequestidentifier(value: number): void;

  getMethod(): string;
  setMethod(value: string): void;

  getParameter(): Uint8Array | string;
  getParameter_asU8(): Uint8Array;
  getParameter_asB64(): string;
  setParameter(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GenericRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GenericRequest): GenericRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GenericRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GenericRequest;
  static deserializeBinaryFromReader(message: GenericRequest, reader: jspb.BinaryReader): GenericRequest;
}

export namespace GenericRequest {
  export type AsObject = {
    requestidentifier: number,
    method: string,
    parameter: Uint8Array | string,
  }
}

export class GenericResponse extends jspb.Message {
  getRequestidentifier(): number;
  setRequestidentifier(value: number): void;

  getResult(): Uint8Array | string;
  getResult_asU8(): Uint8Array;
  getResult_asB64(): string;
  setResult(value: Uint8Array | string): void;

  hasError(): boolean;
  clearError(): void;
  getError(): RPCError | undefined;
  setError(value?: RPCError): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GenericResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GenericResponse): GenericResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GenericResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GenericResponse;
  static deserializeBinaryFromReader(message: GenericResponse, reader: jspb.BinaryReader): GenericResponse;
}

export namespace GenericResponse {
  export type AsObject = {
    requestidentifier: number,
    result: Uint8Array | string,
    error?: RPCError.AsObject,
  }
}

export class GenericNotification extends jspb.Message {
  getMethod(): string;
  setMethod(value: string): void;

  getParameter(): Uint8Array | string;
  getParameter_asU8(): Uint8Array;
  getParameter_asB64(): string;
  setParameter(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GenericNotification.AsObject;
  static toObject(includeInstance: boolean, msg: GenericNotification): GenericNotification.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GenericNotification, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GenericNotification;
  static deserializeBinaryFromReader(message: GenericNotification, reader: jspb.BinaryReader): GenericNotification;
}

export namespace GenericNotification {
  export type AsObject = {
    method: string,
    parameter: Uint8Array | string,
  }
}

export class RPCError extends jspb.Message {
  getCode(): number;
  setCode(value: number): void;

  getMessage(): string;
  setMessage(value: string): void;

  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RPCError.AsObject;
  static toObject(includeInstance: boolean, msg: RPCError): RPCError.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RPCError, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RPCError;
  static deserializeBinaryFromReader(message: RPCError, reader: jspb.BinaryReader): RPCError;
}

export namespace RPCError {
  export type AsObject = {
    code: number,
    message: string,
    data: Uint8Array | string,
  }
}

export class CancelOperationRequest extends jspb.Message {
  getRequestidentifiertocancel(): number;
  setRequestidentifiertocancel(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CancelOperationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CancelOperationRequest): CancelOperationRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CancelOperationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CancelOperationRequest;
  static deserializeBinaryFromReader(message: CancelOperationRequest, reader: jspb.BinaryReader): CancelOperationRequest;
}

export namespace CancelOperationRequest {
  export type AsObject = {
    requestidentifiertocancel: number,
  }
}

export class RPCDataPayload extends jspb.Message {
  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RPCDataPayload.AsObject;
  static toObject(includeInstance: boolean, msg: RPCDataPayload): RPCDataPayload.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RPCDataPayload, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RPCDataPayload;
  static deserializeBinaryFromReader(message: RPCDataPayload, reader: jspb.BinaryReader): RPCDataPayload;
}

export namespace RPCDataPayload {
  export type AsObject = {
    data: Uint8Array | string,
  }
}

