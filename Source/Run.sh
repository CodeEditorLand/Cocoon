# File: Cocoon/Source/Run.sh
# Responsibility: Manages the compilation of TypeScript files in the Source directory into the specified target configuration file using ESBuild, enabling efficient development and watching for changes.
# Modified: 2025-06-07 00:57:47 UTC

#!/usr/bin/env bash

Build "Source/Configuration/**/*.ts" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

Build Build 'Source/**/*.ts' \
	--ESBuild Configuration/ESBuild/Target.js \
	--Watch
