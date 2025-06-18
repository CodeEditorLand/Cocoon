# File: Cocoon/Source/prepublishOnly.sh
# Responsibility: Manages the build process for TypeScript files in the Cocoon sidecar, utilizing ESBuild and TypeScript configurations to compile both application code and extensions for efficient execution in the Node.js environment.
# Modified: 2025-06-07 05:37:43 UTC

Build "Source/Configuration/**/*.ts" --ESBuild Source/Configuration/ESBuild/Cocoon.ts

Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js \
	--TypeScript tsconfig.Target.json
