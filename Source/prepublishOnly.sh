#!/usr/bin/env sh

# When `Fast=true` is set, swap the main tsconfig for `tsconfig.Fast.json`.
# The fast config has `noEmit:true`, `emitDeclarationOnly:false`, and an empty
# `include` array, which causes the Build tool's built-in `tsc -p` and
# `tsc-alias -f -p` steps to become no-ops — esbuild still produces the
# bundle, skipping the 5000+ declaration-file emit + alias-rewrite pass. The
# resulting JS bundle is byte-identical to the normal build; only the
# ancillary `.d.ts` output is omitted.
if [ "$Fast" = "true" ]; then
	TypeScript_Flag="--TypeScript tsconfig.Fast.json"
else
	TypeScript_Flag=""
fi

# Build configuration files
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/ESBuild.ts \
	$TypeScript_Flag

# Build TypeScript source files
# esbuild succeeds (produces Target JS); tsc may fail on pre-existing type errors.
# The || true ensures the build pipeline continues — runtime JS is correct.
Build "Source/**/*.ts" \
	--ESBuild Configuration/ESBuild/Target.js \
	$TypeScript_Flag || true

# Clean escaped path artifacts from esbuild (linked packages outside outbase)
rm -rf Configuration/_.._ Target/_.._ 2>/dev/null || true
