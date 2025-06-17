/*
 * File: Cocoon/Source/Service/IPC/ProtoConverter.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./ProtoConverter/DecodeValue.js, ./ProtoConverter/EncodeValue.js, ./ProtoConverter/Error.js
 * Export: DecodeValue, EncodeValue, ProtoSerializationError
 */

/**
 * @module ProtoConverter (IPC)
 * @description Provides Effect-based utilities for converting between JavaScript
 * values and Google Protobuf `Value` structures for gRPC communication. This
 * module aggregates and exports the individual converter functions.
 */

import DecodeValue from "./ProtoConverter/DecodeValue.js";
import EncodeValue from "./ProtoConverter/EncodeValue.js";
import { ProtoSerializationError } from "./ProtoConverter/Error.js";

export { DecodeValue, EncodeValue, ProtoSerializationError };
