#!/usr/bin/env bash

# Build configuration files
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

# Build TypeScript source files
Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js
