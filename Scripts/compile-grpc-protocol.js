#!/usr/bin/env node

/**
 * @module compile-grpc-protocol
 * @description
 * Compile Mountain's Vine.proto to TypeScript definitions for Cocoon.
 * This script generates gRPC service definitions from Mountain's protocol buffer.
 * 
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Protocol Compilation)
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";

const MOUNTAIN_PROTO_PATH = "../Mountain/Proto/Vine.proto";
const OUTPUT_DIR = "../Source/Generated";
const TS_PROTO_OUTPUT = join(OUTPUT_DIR, "Vine.ts");

/**
 * Main compilation function
 */
async function compileGrpcProtocol() {
    console.log("[compile-grpc-protocol] Starting gRPC protocol compilation");
    
    try {
        // Check if protoc is available
        checkProtocAvailability();
        
        // Ensure Mountain's proto file exists
        ensureProtoFileExists();
        
        // Ensure output directory exists
        ensureOutputDirectory();
        
        // Compile proto to TypeScript
        await compileProtoToTypeScript();
        
        // Generate service interfaces
        await generateServiceInterfaces();
        
        console.log("[compile-grpc-protocol] gRPC protocol compilation completed successfully");
        
    } catch (error) {
        console.error("[compile-grpc-protocol] Protocol compilation failed:", error);
        process.exit(1);
    }
}

/**
 * Check if protoc is available
 */
function checkProtocAvailability() {
    try {
        execSync("protoc --version", { stdio: "ignore" });
        console.log("[compile-grpc-protocol] protoc compiler found");
    } catch (error) {
        console.error("[compile-grpc-protocol] protoc compiler not found. Please install protobuf compiler.");
        console.error("Installation: https://grpc.io/docs/protoc-installation/");
        throw error;
    }
}

/**
 * Ensure Mountain's proto file exists
 */
function ensureProtoFileExists() {
    if (!existsSync(MOUNTAIN_PROTO_PATH)) {
        throw new Error(`Mountain proto file not found at: ${MOUNTAIN_PROTO_PATH}`);
    }
    console.log(`[compile-grpc-protocol] Found proto file: ${MOUNTAIN_PROTO_PATH}`);
}

/**
 * Ensure output directory exists
 */
function ensureOutputDirectory() {
    if (!existsSync(OUTPUT_DIR)) {
        execSync(`mkdir -p ${OUTPUT_DIR}`);
        console.log(`[compile-grpc-protocol] Created output directory: ${OUTPUT_DIR}`);
    }
}

/**
 * Compile proto to TypeScript using protoc
 */
async function compileProtoToTypeScript() {
    console.log("[compile-grpc-protocol] Compiling proto to TypeScript");
    
    const command = `protoc \
        --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
        --ts_out=${OUTPUT_DIR} \
        --proto_path=${dirname(MOUNTAIN_PROTO_PATH)} \
        ${MOUNTAIN_PROTO_PATH}`;
    
    try {
        execSync(command, { stdio: "inherit" });
        console.log("[compile-grpc-protocol] Proto compilation successful");
    } catch (error) {
        console.error("[compile-grpc-protocol] Proto compilation failed");
        throw error;
    }
}

/**
 * Generate service interfaces from compiled proto
 */
async function generateServiceInterfaces() {
    console.log("[compile-grpc-protocol] Generating service interfaces");
    
    const protoContent = readFileSync(MOUNTAIN_PROTO_PATH, "utf8");
    
    // Parse service definitions from proto
    const serviceDefinitions = parseServiceDefinitions(protoContent);
    
    // Generate TypeScript interfaces
    const tsInterfaces = generateTypeScriptInterfaces(serviceDefinitions);
    
    // Write interfaces to file
    writeFileSync(TS_PROTO_OUTPUT, tsInterfaces);
    console.log(`[compile-grpc-protocol] Generated service interfaces: ${TS_PROTO_OUTPUT}`);
}

/**
 * Parse service definitions from proto content
 */
function parseServiceDefinitions(protoContent) {
    const services = [];
    
    // Parse MountainService
    const mountainServiceMatch = protoContent.match(/service MountainService \{[^}]+\}/s);
    if (mountainServiceMatch) {
        services.push({
            name: "MountainService",
            methods: parseServiceMethods(mountainServiceMatch[0])
        });
    }
    
    // Parse CocoonService
    const cocoonServiceMatch = protoContent.match(/service CocoonService \{[^}]+\}/s);
    if (cocoonServiceMatch) {
        services.push({
            name: "CocoonService", 
            methods: parseServiceMethods(cocoonServiceMatch[0])
        });
    }
    
    return services;
}

/**
 * Parse service methods from service definition
 */
function parseServiceMethods(serviceContent) {
    const methods = [];
    const methodRegex = /rpc\s+(\w+)\((\w+)\)\s+returns\s+\((\w+)\)/g;
    let match;
    
    while ((match = methodRegex.exec(serviceContent)) !== null) {
        methods.push({
            name: match[1],
            requestType: match[2],
            responseType: match[3]
        });
    }
    
    return methods;
}

/**
 * Generate TypeScript interfaces from service definitions
 */
function generateTypeScriptInterfaces(services) {
    let tsCode = `/**
 * @module Generated
 * @description
 * Auto-generated TypeScript interfaces from Mountain's Vine.proto
 * Generated by compile-grpc-protocol.js
 * 
 * DO NOT EDIT MANUALLY - This file is automatically generated
 */

`;
    
    // Generate service interfaces
    services.forEach(service => {
        tsCode += `export interface ${service.name} {
`;
        
        service.methods.forEach(method => {
            tsCode += `    ${method.name}(request: ${method.requestType}): Promise<${method.responseType}>;
`;
        });
        
        tsCode += `}

`;
    });
    
    // Generate message interfaces
    tsCode += generateMessageInterfaces();
    
    return tsCode;
}

/**
 * Generate message interfaces based on proto definitions
 */
function generateMessageInterfaces() {
    return `
// Message interfaces based on Vine.proto
export interface GenericRequest {
    RequestIdentifier: number;
    Method: string;
    Parameter: Buffer;
}

export interface GenericResponse {
    RequestIdentifier: number;
    Result: Buffer;
    error?: RPCError;
}

export interface GenericNotification {
    Method: string;
    Parameter: Buffer;
}

export interface RPCError {
    Code: number;
    Message: string;
    Data?: Buffer;
}

export interface CancelOperationRequest {
    RequestIdentifierToCancel: number;
}

export interface Empty {}

export interface RPCDataPayload {
    Data: Buffer;
}
`;
}

/**
 * Entry point
 */
if (require.main === module) {
    compileGrpcProtocol().catch(error => {
        console.error("[compile-grpc-protocol] Error:", error);
        process.exit(1);
    });
}

export default compileGrpcProtocol;
