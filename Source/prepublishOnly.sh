#!/usr/bin/env bash

# Cocoon Prepublish Script - Production Build
# Based on Wind's successful patterns

# Compile gRPC protocol definitions for production
# Specification: MOUNTAIN-COCOON-INTEGRATION.md (Protocol Compilation)
echo "[Cocoon] Compiling gRPC protocol definitions..."
npm run compile-protocol

Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js

# TODO: Add Cocoon bootstrap script bundling
# Specification: MOUNTAIN-COCOON-INTEGRATION.md (Production Bootstrap)
# Implementation: Bundle bootstrap script with dependencies
# Dependencies: ESBuild bundling, dependency optimization
# Validation: Standalone Cocoon executable for Mountain
