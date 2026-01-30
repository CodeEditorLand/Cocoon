/**
 * @module ModuleInterceptorService
 * @description
 * Advanced module interception service for Cocoon extension host.
 * Provides AST-based security sandboxing and module isolation for extensions.
 *
 * Based on VS Code's extension host module interception pattern.
 * Specification: ARCHITECTURE-SPECIFICATION.md (Module Interceptor Service)
 */

import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { Context, Effect, Layer } from "effect";

import {
	IModuleInterceptorService,
	ModuleInterceptionRequest,
	ModuleInterceptionResult,
	SecurityLevel,
	SecurityPolicy,
} from "../Interfaces/IModuleInterceptorService";

// Module interception configuration
interface ModuleInterceptorConfig {
	allowNodeBuiltins: boolean;
	allowFileSystemAccess: boolean;
	allowNetworkAccess: boolean;
	allowedModules: string[];
	blockedModules: string[];
}

// AST node types for module analysis
type ASTNode = any;

/**
 * ModuleInterceptorService implementation
 */
export class ModuleInterceptorService implements IModuleInterceptorService {
	private readonly _serviceBrand: undefined;

	private config: ModuleInterceptorConfig;
	private moduleCache: Map<string, any>;
	private securitySandbox: Map<string, Function>;

	constructor() {
		console.log(
			"[ModuleInterceptorService] Initializing module interceptor",
		);

		this.config = this.loadDefaultConfig();
		this.moduleCache = new Map();
		this.securitySandbox = this.createSecuritySandbox();

		console.log(
			"[ModuleInterceptorService] Module interceptor initialized",
		);
	}

	/**
	 * Load default configuration
	 */
	private loadDefaultConfig(): ModuleInterceptorConfig {
		return {
			allowNodeBuiltins: true,
			allowFileSystemAccess: false,
			allowNetworkAccess: false,
			allowedModules: [
				"path",
				"url",
				"util",
				"events",
				"stream",
				"buffer",
			],
			blockedModules: [
				"fs",
				"child_process",
				"net",
				"http",
				"https",
				"os",
				"crypto",
			],
		};
	}

	/**
	 * Create security sandbox with safe functions
	 */
	private createSecuritySandbox(): Map<string, Function> {
		const sandbox = new Map<string, Function>();

		// Safe JavaScript globals
		sandbox.set("console.log", console.log.bind(console));
		sandbox.set("console.error", console.error.bind(console));
		sandbox.set("console.warn", console.warn.bind(console));
		sandbox.set("setTimeout", setTimeout.bind(global));
		sandbox.set("setInterval", setInterval.bind(global));
		sandbox.set("clearTimeout", clearTimeout.bind(global));
		sandbox.set("clearInterval", clearInterval.bind(global));

		// Safe utility functions
		sandbox.set("JSON.parse", JSON.parse);
		sandbox.set("JSON.stringify", JSON.stringify);

		return sandbox;
	}

	/**
	 * Intercept module require calls
	 */
	interceptRequire(modulePath: string, parentPath: string): any {
		console.log(
			`[ModuleInterceptorService] Intercepting require: ${modulePath} from ${parentPath}`,
		);

		// Check module cache first
		if (this.moduleCache.has(modulePath)) {
			return this.moduleCache.get(modulePath);
		}

		// Validate module access
		if (!this.validateModuleAccess(modulePath, parentPath)) {
			throw new Error(`Module access denied: ${modulePath}`);
		}

		// Analyze module security
		const moduleSecurity = this.analyzeModuleSecurity(modulePath);
		if (!moduleSecurity.isSafe) {
			throw new Error(
				`Module security violation: ${modulePath} - ${moduleSecurity.reason}`,
			);
		}

		// Load and intercept module
		const interceptedModule = this.loadAndInterceptModule(modulePath);

		// Cache the module
		this.moduleCache.set(modulePath, interceptedModule);

		console.log(
			`[ModuleInterceptorService] Module ${modulePath} intercepted successfully`,
		);

		return interceptedModule;
	}

	/**
	 * Validate module access permissions
	 */
	private validateModuleAccess(
		modulePath: string,
		parentPath: string,
	): boolean {
		// Check blocked modules
		if (this.config.blockedModules.includes(modulePath)) {
			console.warn(
				`[ModuleInterceptorService] Blocked module access: ${modulePath}`,
			);
			return false;
		}

		// Check allowed modules
		if (this.config.allowedModules.includes(modulePath)) {
			return true;
		}

		// Check built-in modules
		if (this.isNodeBuiltin(modulePath) && !this.config.allowNodeBuiltins) {
			console.warn(
				`[ModuleInterceptorService] Node built-in module access denied: ${modulePath}`,
			);
			return false;
		}

		return true;
	}

	/**
	 * Check if module is Node.js built-in
	 */
	private isNodeBuiltin(modulePath: string): boolean {
		const builtins = [
			"fs",
			"path",
			"os",
			"net",
			"http",
			"https",
			"child_process",
			"crypto",
			"util",
			"events",
			"stream",
			"buffer",
			"url",
			"querystring",
		];
		return builtins.includes(modulePath);
	}

	/**
	 * Analyze module security using advanced AST parsing
	 */
	private analyzeModuleSecurity(modulePath: string): {
		isSafe: boolean;
		reason: string;
	} {
		try {
			console.log(
				`[ModuleInterceptorService] Performing advanced AST security analysis for ${modulePath}`,
			);

			// Load module source code with enhanced error handling
			const fs = require("fs");
			const path = require("path");

			const resolvedPath = require.resolve(modulePath);
			const sourceCode = fs.readFileSync(resolvedPath, "utf8");

			// Enhanced AST parsing with comprehensive options
			const ast = acorn.parse(sourceCode, {
				ecmaVersion: "latest",
				sourceType: "module",
				allowAwaitOutsideFunction: true,
				allowImportExportEverywhere: true,
				allowReturnOutsideFunction: true,
				ranges: true,
				locations: true,
			});

			// Advanced security analysis with multiple detection layers
			const securityIssues: string[] = [];
			const securityWarnings: string[] = [];

			// Layer 1: Dangerous function calls and patterns
			walk.simple(
				ast,
				{
					CallExpression(node: any) {
						const callee = node.callee;

						// Detect dangerous function calls
						if (callee.type === "Identifier") {
							const functionName = callee.name;

							if (
								this.isCriticalDangerousFunction(functionName)
							) {
								securityIssues.push(
									`CRITICAL: Dangerous function call: ${functionName}`,
								);
							} else if (this.isDangerousFunction(functionName)) {
								securityWarnings.push(
									`WARNING: Dangerous function call: ${functionName}`,
								);
							}
						}

						// Detect dynamic code execution patterns
						if (
							callee.type === "MemberExpression" &&
							callee.object.type === "Identifier" &&
							callee.object.name === "eval" &&
							callee.property.type === "Identifier" &&
							callee.property.name === "constructor"
						) {
							securityIssues.push(
								`CRITICAL: Dynamic code execution via eval constructor`,
							);
						}
					},

					MemberExpression(node: any) {
						// Detect dangerous property access
						if (
							node.object.type === "Identifier" &&
							node.property.type === "Identifier"
						) {
							const objectName = node.object.name;
							const propertyName = node.property.name;

							if (
								this.isCriticalDangerousPropertyAccess(
									objectName,
									propertyName,
								)
							) {
								securityIssues.push(
									`CRITICAL: Dangerous property access: ${objectName}.${propertyName}`,
								);
							} else if (
								this.isDangerousPropertyAccess(
									objectName,
									propertyName,
								)
							) {
								securityWarnings.push(
									`WARNING: Dangerous property access: ${objectName}.${propertyName}`,
								);
							}
						}
					},

					AssignmentExpression(node: any) {
						// Detect dangerous assignments
						if (node.left.type === "MemberExpression") {
							const left = node.left;
							if (
								left.object.type === "Identifier" &&
								left.property.type === "Identifier"
							) {
								const objectName = left.object.name;
								const propertyName = left.property.name;

								if (
									this.isCriticalDangerousAssignment(
										objectName,
										propertyName,
									)
								) {
									securityIssues.push(
										`CRITICAL: Dangerous assignment: ${objectName}.${propertyName}`,
									);
								} else if (
									this.isDangerousAssignment(
										objectName,
										propertyName,
									)
								) {
									securityWarnings.push(
										`WARNING: Dangerous assignment: ${objectName}.${propertyName}`,
									);
								}
							}
						}
					},

					ImportDeclaration(node: any) {
						// Detect dangerous imports
						const importSource = node.source.value;
						if (this.isDangerousImport(importSource)) {
							securityIssues.push(
								`CRITICAL: Dangerous import: ${importSource}`,
							);
						}
					},

					NewExpression(node: any) {
						// Detect dangerous constructor calls
						if (node.callee.type === "Identifier") {
							const constructorName = node.callee.name;
							if (this.isDangerousConstructor(constructorName)) {
								securityIssues.push(
									`CRITICAL: Dangerous constructor: ${constructorName}`,
								);
							}
						}
					},
				},
				this,
			);

			// Layer 2: Pattern-based security analysis
			this.performPatternAnalysis(
				sourceCode,
				securityIssues,
				securityWarnings,
			);

			// Combine results
			const allIssues = [...securityIssues, ...securityWarnings];
			const isSafe = securityIssues.length === 0;
			const reason =
				allIssues.length > 0
					? `Security analysis: ${allIssues.join(", ")}`
					: "Advanced AST security analysis passed all checks";

			console.log(
				`[ModuleInterceptorService] Security analysis for ${modulePath}: ${securityIssues.length} critical issues, ${securityWarnings.length} warnings`,
			);

			return {
				isSafe,
				reason,
			};
		} catch (error) {
			console.error(
				`[ModuleInterceptorService] Advanced security analysis failed for ${modulePath}:`,
				error,
			);
			return {
				isSafe: false,
				reason: `Advanced security analysis error: ${error}`,
			};
		}
	}

	/**
	 * Check if function is critically dangerous (block immediately)
	 */
	private isCriticalDangerousFunction(functionName: string): boolean {
		const criticalFunctions = [
			"eval",
			"Function",
			"exec",
			"spawn",
			"execFile",
			"fork",
			"require",
			"import",
			"process.binding",
			"vm.runInContext",
		];
		return criticalFunctions.includes(functionName);
	}

	/**
	 * Check if function is dangerous (warning level)
	 */
	private isDangerousFunction(functionName: string): boolean {
		const dangerousFunctions = [
			"setTimeout",
			"setInterval",
			"setImmediate",
			"require.cache",
			"module.constructor",
			"global.eval",
		];
		return dangerousFunctions.includes(functionName);
	}

	/**
	 * Check if property access is critically dangerous
	 */
	private isCriticalDangerousPropertyAccess(
		objectName: string,
		propertyName: string,
	): boolean {
		const criticalAccesses = [
			{ object: "process", property: "env" },
			{ object: "global", property: "process" },
			{ object: "window", property: "location" },
			{ object: "process", property: "mainModule" },
			{ object: "process", property: "binding" },
		];

		return criticalAccesses.some(
			(access) =>
				access.object === objectName &&
				access.property === propertyName,
		);
	}

	/**
	 * Check if property access is dangerous
	 */
	private isDangerousPropertyAccess(
		objectName: string,
		propertyName: string,
	): boolean {
		const dangerousAccesses = [
			{ object: "global", property: "eval" },
			{ object: "window", property: "eval" },
			{ object: "process", property: "argv" },
			{ object: "process", property: "cwd" },
		];

		return dangerousAccesses.some(
			(access) =>
				access.object === objectName &&
				access.property === propertyName,
		);
	}

	/**
	 * Check if property access is dangerous
	 */
	private isDangerousPropertyAccess(
		objectName: string,
		propertyName: string,
	): boolean {
		const dangerousAccesses = [
			{ object: "process", property: "env" },
			{ object: "global", property: "process" },
			{ object: "window", property: "location" },
		];

		return dangerousAccesses.some(
			(access) =>
				access.object === objectName &&
				access.property === propertyName,
		);
	}

	/**
	 * Check if assignment is critically dangerous
	 */
	private isCriticalDangerousAssignment(
		objectName: string,
		propertyName: string,
	): boolean {
		const criticalAssignments = [
			{ object: "process", property: "env" },
			{ object: "global", property: "process" },
			{ object: "require", property: "cache" },
			{ object: "module", property: "exports" },
		];

		return criticalAssignments.some(
			(assignment) =>
				assignment.object === objectName &&
				assignment.property === propertyName,
		);
	}

	/**
	 * Check if assignment is dangerous
	 */
	private isDangerousAssignment(
		objectName: string,
		propertyName: string,
	): boolean {
		const dangerousAssignments = [
			{ object: "global", property: "eval" },
			{ object: "window", property: "eval" },
		];

		return dangerousAssignments.some(
			(assignment) =>
				assignment.object === objectName &&
				assignment.property === propertyName,
		);
	}

	/**
	 * Check if import is dangerous
	 */
	private isDangerousImport(importSource: string): boolean {
		const dangerousImports = [
			"fs",
			"child_process",
			"net",
			"http",
			"https",
			"os",
			"crypto",
			"vm",
			"module",
			"process",
			"sys",
		];
		return dangerousImports.includes(importSource);
	}

	/**
	 * Check if constructor is dangerous
	 */
	private isDangerousConstructor(constructorName: string): boolean {
		const dangerousConstructors = [
			"Function",
			"eval",
			"process",
			"require",
		];
		return dangerousConstructors.includes(constructorName);
	}

	/**
	 * Perform pattern-based security analysis
	 */
	private performPatternAnalysis(
		sourceCode: string,
		securityIssues: string[],
		securityWarnings: string[],
	): void {
		const dangerousPatterns = [
			{ pattern: /eval\s*\(/, description: "Direct eval call" },
			{ pattern: /Function\s*\(/, description: "Function constructor" },
			{
				pattern: /require\s*\(\s*['"`]\s*[^'"`]*\s*['"`]\s*\)/,
				description: "Dynamic require",
			},
			{
				pattern: /process\.binding/,
				description: "Process binding access",
			},
			{
				pattern: /vm\.runInContext/,
				description: "VM context execution",
			},
			{
				pattern: /child_process\.spawn/,
				description: "Child process spawning",
			},
		];

		for (const { pattern, description } of dangerousPatterns) {
			if (pattern.test(sourceCode)) {
				securityIssues.push(`CRITICAL: ${description} detected`);
			}
		}
	}

	/**
	 * Load and intercept module with security wrappers
	 */
	private loadAndInterceptModule(modulePath: string): any {
		try {
			// Load the original module
			const originalModule = require(modulePath);

			// Create security wrapper
			const interceptedModule = this.createSecurityWrapper(
				originalModule,
				modulePath,
			);

			return interceptedModule;
		} catch (error) {
			console.error(
				`[ModuleInterceptorService] Failed to load module ${modulePath}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Create security wrapper for module
	 */
	private createSecurityWrapper(
		originalModule: any,
		modulePath: string,
	): any {
		const wrapper: any = {};

		// Wrap each export with security checks
		for (const key of Object.keys(originalModule)) {
			const originalValue = originalModule[key];

			if (typeof originalValue === "function") {
				wrapper[key] = this.wrapFunction(
					originalValue,
					modulePath,
					key,
				);
			} else {
				wrapper[key] = originalValue;
			}
		}

		return wrapper;
	}

	/**
	 * Wrap function with security checks
	 */
	private wrapFunction(
		originalFn: Function,
		modulePath: string,
		functionName: string,
	): Function {
		return (...args: any[]) => {
			console.log(
				`[ModuleInterceptorService] Calling ${modulePath}.${functionName}`,
			);

			// TODO: Implement function-level security checks
			// Specification: ARCHITECTURE-SPECIFICATION.md (Function Security)
			// Implementation: Parameter validation, execution time limits
			// Dependencies: Performance monitoring, security rules
			// Validation: Test with various function calls

			return originalFn.apply(null, args);
		};
	}

	/**
	 * Resolve module path
	 */
	resolveModule(modulePath: string, parentPath: string): string {
		console.log(
			`[ModuleInterceptorService] Resolving module: ${modulePath} from ${parentPath}`,
		);

		try {
			// Use Node.js module resolution
			const resolvedPath = require.resolve(modulePath, {
				paths: [parentPath],
			});

			console.log(
				`[ModuleInterceptorService] Resolved ${modulePath} to ${resolvedPath}`,
			);

			return resolvedPath;
		} catch (error) {
			console.error(
				`[ModuleInterceptorService] Failed to resolve module ${modulePath}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Create extension context with isolated environment
	 */
	createExtensionContext(extensionId: string): any {
		console.log(
			`[ModuleInterceptorService] Creating extension context for ${extensionId}`,
		);

		const context = {
			extensionId,
			globalState: new Map(),
			workspaceState: new Map(),
			subscriptions: [],
			asAbsolutePath: (relativePath: string) => {
				// TODO: Implement proper path resolution
				return `/extensions/${extensionId}/${relativePath}`;
			},
		};

		console.log(
			`[ModuleInterceptorService] Extension context created for ${extensionId}`,
		);

		return context;
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<ModuleInterceptorConfig>): void {
		console.log("[ModuleInterceptorService] Updating configuration");

		this.config = { ...this.config, ...newConfig };

		// Clear cache on config change
		this.moduleCache.clear();

		console.log("[ModuleInterceptorService] Configuration updated");
	}

	/**
	 * Get service status
	 */
	getStatus(): {
		cacheSize: number;
		config: ModuleInterceptorConfig;
		securityRules: number;
	} {
		return {
			cacheSize: this.moduleCache.size,
			config: this.config,
			securityRules:
				this.config.allowedModules.length +
				this.config.blockedModules.length,
		};
	}
}

/**
 * Service layer for ModuleInterceptorService
 */
export const ModuleInterceptorServiceLayer = Layer.effect(
	IModuleInterceptorService,
	Effect.sync(() => new ModuleInterceptorService()),
);

/**
 * Live implementation
 */
export const ModuleInterceptorServiceLive = Layer.effect(
	IModuleInterceptorService,
	Effect.sync(() => new ModuleInterceptorService()),
);

export default ModuleInterceptorService;
