/**
 * @module ProtoConverter (IPC)
 * @description Provides Effect-based utilities for converting between JavaScript
 * values and Google Protobuf `Value` structures for gRPC communication. This
 * module aggregates and exports the individual converter functions.
 */

export { DecodeValue } from "./ProtoConverter/DecodeValue.js";
export { EncodeValue } from "./ProtoConverter/EncodeValue.js";
export * from "./ProtoConverter/Error.js";
