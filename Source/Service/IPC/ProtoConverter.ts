/*
 * File: Cocoon/Source/Service/IPC/ProtoConverter.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:00 UTC
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
