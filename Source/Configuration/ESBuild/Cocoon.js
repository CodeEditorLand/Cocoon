/*
 * File: Cocoon/Source/Configuration/ESBuild/Cocoon.ts
 * Responsibility: Configures ESBuild for the Cocoon Node.js sidecar process, defining build options and cleanup logic to bundle VS Code extension host dependencies during development.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: esbuild
 * Export: Clean, On
 */
export const On = process.env["NODE_ENV"] === "development" ||
    process.env["TAURI_ENV_DEBUG"] === "true";
export const Clean = process.env["Clean"] === "true";
/**
 * @module ESBuild
 *
 */
export default {
    color: true,
    format: "esm",
    logLevel: "debug",
    metafile: true,
    minify: !On,
    outdir: "Configuration",
    platform: "node",
    target: "esnext",
    tsconfig: "tsconfig.json",
    write: true,
    legalComments: On ? "inline" : "none",
    bundle: false,
    assetNames: "Asset/[name]-[hash]",
    sourcemap: On,
    drop: On ? [] : ["debugger"],
    ignoreAnnotations: !On,
    keepNames: On,
    plugins: [
        {
            name: "Target",
            // @ts-ignore
            setup({ onStart, initialOption: { outdir } }) {
                switch (true) {
                    case Clean === true:
                        onStart(async () => {
                            try {
                                outdir
                                    ? await (await import("node:fs/promises")).rm(outdir, {
                                        recursive: true,
                                    })
                                    : {};
                            }
                            catch (_Error) {
                                console.log(_Error);
                            }
                        });
                        break;
                    default:
                        break;
                }
            },
        },
    ],
    outbase: "Source/Configuration",
};
export const { sep, posix } = await import("node:path");
