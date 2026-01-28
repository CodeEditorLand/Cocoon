#!/usr/bin/env bash

# Cocoon Run Script - Development Mode
# Based on Mountain integration patterns

# Compile gRPC protocol definitions
# Specification: MOUNTAIN-COCOON-INTEGRATION.md (Protocol Compilation)
echo "[Cocoon] Compiling gRPC protocol definitions..."
npm run compile-protocol

# Build configuration files
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

# Build TypeScript source files with watch mode
Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js \
	--Watch

# TODO: Add Cocoon bootstrap script execution
# Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bootstrap Process)
# Implementation: Node.js bootstrap script with environment setup
# Dependencies: Node.js runtime, environment variables
# Validation: Successful Cocoon launch by Mountain
