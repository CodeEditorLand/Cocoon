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

# Start Cocoon bootstrap script
# Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bootstrap Process)
echo "[Cocoon] Starting Cocoon bootstrap..."
node Scripts/cocoon/bootstrap-fork.js \
    --port=50052 \
    --mountain-host=localhost \
    --mountain-port=50051 \
    --debug=true
