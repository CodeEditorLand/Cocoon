#!/usr/bin/env bash

Build "Source/Configuration/**/*.ts" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts

Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js \
	--Watch
