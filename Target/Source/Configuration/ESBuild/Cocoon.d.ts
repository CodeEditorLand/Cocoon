import type { BuildOptions } from 'esbuild';
/**
 * ESBuild configuration for Cocoon that properly handles TypeScript generators
 * with `yield*` syntax in ES modules environment.
 *
 * This configuration ensures that Effect-TS generators work correctly
 * while maintaining full ESM compatibility.
 */
export declare const CocoonESBuildConfig: BuildOptions;
/**
 * Development-specific ESBuild configuration
 */
export declare const CocoonESBuildDevConfig: BuildOptions;
/**
 * Production-specific ESBuild configuration
 */
export declare const CocoonESBuildProdConfig: BuildOptions;
//# sourceMappingURL=Cocoon.d.ts.map