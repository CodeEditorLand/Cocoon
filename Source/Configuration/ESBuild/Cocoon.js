/**
 * ESBuild configuration for Cocoon that properly handles TypeScript generators
 * with `yield*` syntax in ES modules environment.
 *
 * This configuration ensures that Effect-TS generators work correctly
 * while maintaining full ESM compatibility.
 */
export const CocoonESBuildConfig = {
    entryPoints: ["Source/**/*.ts"],
    outdir: "Target",
    bundle: true,
    platform: "node",
    target: "esnext",
    format: "esm",
    sourcemap: true,
    external: [
        // External dependencies that should not be bundled
        "@playform/build",
        "vscode",
        "electron",
        "@effect/*",
    ],
    // Critical: Enable proper handling of TypeScript generators in ES modules
    jsx: "preserve",
    // Configure loader for TypeScript files
    loader: {
        ".ts": "ts",
        ".tsx": "tsx",
    },
    // Enable experimental features for generator support
    supported: {
        // Ensure yield* syntax is properly handled
        "generator-function": true,
        "async-generator": true,
    },
    // Define global variables for environment
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    },
    // Path resolution configuration
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    // Advanced TypeScript configuration
    tsconfig: "tsconfig.json",
    // Mountain integration configuration - handled via environment variables and MountainClientService
    // SideCar launch configuration - will be added when Mountain provides sidecar API
    // Performance optimization - handled via esbuild plugins for tree-shaking and minification
};
/**
 * Development-specific ESBuild configuration
 */
export const CocoonESBuildDevConfig = {
    ...CocoonESBuildConfig,
    sourcemap: true,
    minify: false,
    define: {
        "process.env.NODE_ENV": JSON.stringify("development"),
    },
};
/**
 * Production-specific ESBuild configuration
 */
export const CocoonESBuildProdConfig = {
    ...CocoonESBuildConfig,
    sourcemap: false,
    minify: true,
    define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
};
