# File: Cocoon/Source/prepublishOnly.sh
# Responsibility: Manages the build process for TypeScript files in the Land project, ensuring efficient compilation and configuration management for both the application and its extensions.
# Modified: 2025-06-07 00:57:47 UTC

#!/usr/bin/env bash

Build "Source/Configuration/**/*.ts" --ESBuild Source/Configuration/ESBuild/Cocoon.ts

Build Build 'Source/**/*.ts' \
	--ESBuild Configuration/ESBuild/Target.js \
	--TypeScript tsconfig.Target.json
