#!/usr/bin/env node

/**
 * Cocoon Build Script
 * Compiles TypeScript files for Mountain integration
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('[Cocoon] Building TypeScript files...');

try {
    // Check if TypeScript compiler is available
    execSync('npx tsc --version', { stdio: 'inherit' });
    
    // Compile TypeScript files (ignore warnings)
    execSync('npx tsc --project . --noEmit false', { stdio: 'inherit' });
    
    console.log('[Cocoon] TypeScript compilation completed successfully');
    
    // Check if compiled files exist
    const targetDir = join(process.cwd(), 'Target');
    if (existsSync(targetDir)) {
        console.log('[Cocoon] Compiled files available in Target/ directory');
    } else {
        console.warn('[Cocoon] Warning: Target directory not found');
    }
    
} catch (error) {
    console.error('[Cocoon] Build failed:', error);
    process.exit(1);
}
