#!/usr/bin/env sh

# Cocoon Run Script - Development Mode
# Based on Wind's successful patterns

# Build configuration files
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

# Build TypeScript source files with watch mode
Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js \
	--Watch
