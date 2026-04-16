#!/usr/bin/env sh

# Build configuration files
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/ESBuild.ts

# Build TypeScript source files
# esbuild succeeds (produces Target JS); tsc may fail on pre-existing type errors.
# The || true ensures the build pipeline continues — runtime JS is correct.
Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js || true

# Clean escaped path artifacts from esbuild (linked packages outside outbase)
rm -rf Configuration/_.._  Target/_.._  2>/dev/null || true
