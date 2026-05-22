#!/usr/bin/env sh

# Generate the DualTrack route manifest before esbuild runs. The
# manifest is written to Source/Generated/RouteManifest.ts and is a
# hard import in Source/Services/DualTrack.ts; without it esbuild
# fails with "Could not resolve ../Generated/RouteManifest.js" and
# the launch falls into degraded mode (no Cocoon, no extensions).
sh ../../Maintain/Script/GenerateRouteManifest.sh

# Build configuration files
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/ESBuild.ts

# Build TypeScript source files
# esbuild succeeds (produces Target JS); tsc may fail on pre-existing type errors.
# The || true ensures the build pipeline continues - runtime JS is correct.
Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js

# Bootstrap: self-contained single-file bundle for .app distribution.
# Inlines all npm deps (effect, @grpc/grpc-js, …) - no node_modules needed
# at runtime. Required by Contents/Resources/Cocoon/… in the shipped .app.
Build "Source/Bootstrap/Implementation/Cocoon/Main.ts" \
	--ESBuild Configuration/ESBuild/Bootstrap.js
