#!/usr/bin/env bash

Build "Source/Configuration/**/*.ts" --ESBuild Source/Configuration/ESBuild/Cocoon.ts

Build Build 'Source/**/*.ts' \
	--ESBuild Configuration/ESBuild/Target.js \
	--TypeScript tsconfig.Target.json
