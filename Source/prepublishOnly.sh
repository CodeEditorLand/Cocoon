#!/usr/bin/env bash

# Cocoon Prepublish Script - Production Build
# Uses @playform/build tool following Wind's successful patterns

# Compile gRPC protocol definitions for production
# Specification: MOUNTAIN-COCOON-INTEGRATION.md (Protocol Compilation)
echo "[Cocoon] Compiling gRPC protocol definitions..."
npm run compile-protocol

# Build configuration files using @playform/build
echo "[Cocoon] Building configuration files..."
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

# Build main source files using @playform/build
echo "[Cocoon] Building main source files..."
Build "Source/**/*.ts" \
	--ESBuild Source/Configuration/ESBuild/Target.ts

# TODO: Add Cocoon bootstrap script bundling
# Specification: MOUNTAIN-COCOON-INTEGRATION.md (Production Bootstrap)
# Implementation: Bundle bootstrap script with dependencies
# Dependencies: ESBuild bundling, dependency optimization
# Validation: Standalone Cocoon executable for Mountain
