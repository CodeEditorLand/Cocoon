#!/usr/bin/env bash

# Cocoon Run Script - Development Mode
# Based on Wind's successful patterns

<<<<<<< HEAD
Build "Configuration/**/*.{js,json}" \
	--ESBuild Configuration/ESBuild/Cocoon.js

Build "Source/**/!(*Archive*|*Bootstrap*)/*.ts" \
=======
# Build configuration files
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

# Build TypeScript source files with watch mode
Build "Source/**/*.ts" \
>>>>>>> fa3d9b64bc09438d18e68bb2e9b3eaf4eb5d34cc
	--ESBuild Configuration/ESBuild/Target.js \
	--Watch
