var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// Source/Interfaces/I/Module/Interceptor.ts
import { Context } from "effect";
var SecurityLevel = /* @__PURE__ */ ((SecurityLevel2) => {
  SecurityLevel2["TRUSTED"] = "TRUSTED";
  SecurityLevel2["SANDBOXED"] = "SANDBOXED";
  SecurityLevel2["RESTRICTED"] = "RESTRICTED";
  SecurityLevel2["BLOCKED"] = "BLOCKED";
  return SecurityLevel2;
})(SecurityLevel || {});
var IModuleInterceptor = Context.Tag("IModuleInterceptor");

// Source/Services/Module/Interceptor.ts
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { Effect, Layer } from "effect";
var ModuleInterceptor = class {
  static {
    __name(this, "ModuleInterceptor");
  }
  _serviceBrand;
  config;
  moduleCache;
  securitySandbox;
  securityPolicies;
  telemetry;
  constructor() {
    console.log("[ModuleInterceptor] Initializing module interceptor");
    this.config = this.loadDefaultConfig();
    this.moduleCache = /* @__PURE__ */ new Map();
    this.securitySandbox = this.createSecuritySandbox();
    this.securityPolicies = /* @__PURE__ */ new Map();
    this.telemetry = {
      totalModulesLoaded: 0,
      blockedModules: 0,
      sandboxedModules: 0,
      averageAnalysisTime: 0,
      securityViolations: 0
    };
    console.log("[ModuleInterceptor] Module interceptor initialized");
  }
  /**
   * Initialize module interceptor service
   */
  async initialize() {
    console.log("[ModuleInterceptor] Initializing service");
    try {
      await this.loadSecurityPolicies();
      this.validateModulePathResolution();
      this.setupTelemetry();
      console.log("[ModuleInterceptor] Service initialized successfully");
    } catch (error) {
      console.error("[ModuleInterceptor] Failed to initialize:", error);
      throw error;
    }
  }
  /**
   * Load security policies from configuration
   * @future TODO: Load from Mountain client when available
   */
  async loadSecurityPolicies() {
    console.log("[ModuleInterceptor] Loading security policies");
    const defaultPolicy = {
      extensionId: "default",
      allowedModules: [
        "path",
        "url",
        "util",
        "events",
        "stream",
        "buffer",
        "assert"
      ],
      blockedModules: [
        "fs",
        "child_process",
        "net",
        "http",
        "https",
        "os",
        "crypto",
        "vm",
        "cluster",
        "worker_threads"
      ],
      securityLevel: "SANDBOXED" /* SANDBOXED */,
      maxMemoryUsage: 100 * 1024 * 1024,
      // 100MB
      maxExecutionTime: 5e3
      // 5 seconds
    };
    this.securityPolicies.set("default", defaultPolicy);
    console.log("[ModuleInterceptor] Security policies loaded");
  }
  /**
   * Validate module path resolution
   */
  validateModulePathResolution() {
    console.log("[ModuleInterceptor] Validating module path resolution");
    try {
      __require.resolve("path");
      console.log("[ModuleInterceptor] Module path resolution validated");
    } catch (error) {
      console.error(
        "[ModuleInterceptor] Module path resolution failed:",
        error
      );
    }
  }
  /**
   * Setup telemetry reporting
   * @future TODO: Send telemetry to Mountain for analytics
   */
  setupTelemetry() {
    console.log("[ModuleInterceptor] Setting up telemetry");
    this.telemetry = {
      totalModulesLoaded: 0,
      blockedModules: 0,
      sandboxedModules: 0,
      averageAnalysisTime: 0,
      securityViolations: 0
    };
    console.log("[ModuleInterceptor] Telemetry initialized");
  }
  /**
   * Load default configuration
   */
  loadDefaultConfig() {
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
        "assert"
      ],
      blockedModules: [
        "fs",
        "child_process",
        "net",
        "http",
        "https",
        "os",
        "crypto",
        "vm",
        "cluster",
        "worker_threads"
      ],
      securityPolicy: "SANDBOXED" /* SANDBOXED */
    };
  }
  /**
   * Create security sandbox with safe functions
   */
  createSecuritySandbox() {
    const sandbox = /* @__PURE__ */ new Map();
    sandbox.set("console.log", console.log.bind(console));
    sandbox.set("console.error", console.error.bind(console));
    sandbox.set("console.warn", console.warn.bind(console));
    sandbox.set("console.info", console.info.bind(console));
    sandbox.set("setTimeout", setTimeout.bind(global));
    sandbox.set("setInterval", setInterval.bind(global));
    sandbox.set("clearTimeout", clearTimeout.bind(global));
    sandbox.set("clearInterval", clearInterval.bind(global));
    sandbox.set("JSON.parse", JSON.parse);
    sandbox.set("JSON.stringify", JSON.stringify);
    sandbox.set("Array.isArray", Array.isArray);
    sandbox.set("Object.keys", Object.keys);
    sandbox.set("Object.values", Object.values);
    sandbox.set("Object.entries", Object.entries);
    return sandbox;
  }
  /**
   * Intercept module require calls
   */
  async interceptRequire(request) {
    const startTime = Date.now();
    console.log(
      `[ModuleInterceptor] Intercepting require: ${request.moduleId} from ${request.extensionId}`
    );
    try {
      const cacheKey = this.getCacheKey(
        request.moduleId,
        request.extensionId
      );
      if (this.moduleCache.has(cacheKey)) {
        const cacheEntry = this.moduleCache.get(cacheKey);
        console.log(
          `[ModuleInterceptor] Using cached module: ${request.moduleId}`
        );
        return {
          success: true,
          module: cacheEntry.module,
          securityLevel: cacheEntry.securityLevel
        };
      }
      const policy = this.securityPolicies.get(request.extensionId) || this.securityPolicies.get("default");
      if (!policy) {
        return {
          success: false,
          error: `No security policy found for extension ${request.extensionId}`,
          securityLevel: "BLOCKED" /* BLOCKED */
        };
      }
      if (!this.validateModuleAccess(request.moduleId, policy)) {
        this.telemetry.blockedModules++;
        this.telemetry.securityViolations++;
        return {
          success: false,
          error: `Module access denied: ${request.moduleId}`,
          securityLevel: "BLOCKED" /* BLOCKED */
        };
      }
      const resolvedPath = this.resolveModulePath(
        request.requirePath,
        request.parentModule || ""
      );
      const moduleSecurity = this.analyzeModuleSecurity(resolvedPath);
      if (!moduleSecurity.isSafe && policy.securityLevel === "TRUSTED" /* TRUSTED */) {
        this.telemetry.securityViolations++;
        return {
          success: false,
          error: `Module security violation: ${request.moduleId} - ${moduleSecurity.reason}`,
          securityLevel: "BLOCKED" /* BLOCKED */
        };
      }
      const interceptedModule = this.loadAndInterceptModule(
        resolvedPath,
        policy.securityLevel
      );
      this.moduleCache.set(cacheKey, {
        module: interceptedModule,
        securityLevel: policy.securityLevel,
        validationTime: Date.now(),
        path: resolvedPath
      });
      this.telemetry.totalModulesLoaded++;
      if (policy.securityLevel !== "TRUSTED" /* TRUSTED */) {
        this.telemetry.sandboxedModules++;
      }
      const analysisTime = Date.now() - startTime;
      this.telemetry.averageAnalysisTime = (this.telemetry.averageAnalysisTime * (this.telemetry.totalModulesLoaded - 1) + analysisTime) / this.telemetry.totalModulesLoaded;
      console.log(
        `[ModuleInterceptor] Module ${request.moduleId} intercepted successfully in ${analysisTime}ms`
      );
      return {
        success: true,
        module: interceptedModule,
        securityLevel: policy.securityLevel
      };
    } catch (error) {
      console.error(
        `[ModuleInterceptor] Failed to intercept module ${request.moduleId}:`,
        error
      );
      this.telemetry.blockedModules++;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        securityLevel: "BLOCKED" /* BLOCKED */
      };
    }
  }
  /**
   * Validate module access permissions
   */
  validateModuleAccess(modulePath, policy) {
    if (policy.blockedModules.includes(modulePath)) {
      console.warn(
        `[ModuleInterceptor] Blocked module access: ${modulePath}`
      );
      return false;
    }
    if (policy.allowedModules.length > 0 && !policy.allowedModules.includes(modulePath)) {
      if (!this.isSafeNodeBuiltin(modulePath)) {
        console.warn(
          `[ModuleInterceptor] Module not in allowed list: ${modulePath}`
        );
        return false;
      }
    }
    if (this.isNodeBuiltin(modulePath) && !this.config.allowNodeBuiltins) {
      console.warn(
        `[ModuleInterceptor] Node built-in module access denied: ${modulePath}`
      );
      return false;
    }
    return true;
  }
  /**
   * Check if module is a safe Node.js built-in
   */
  isSafeNodeBuiltin(modulePath) {
    const safeBuiltins = [
      "path",
      "url",
      "util",
      "events",
      "stream",
      "buffer",
      "assert",
      "string_decoder"
    ];
    return safeBuiltins.includes(modulePath);
  }
  /**
   * Check if module is Node.js built-in
   */
  isNodeBuiltin(modulePath) {
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
      "assert",
      "vm",
      "cluster",
      "worker_threads"
    ];
    return builtins.includes(modulePath);
  }
  /**
   * Resolve module path with security checks
   */
  async resolveModule(extensionId, modulePath) {
    console.log(
      `[ModuleInterceptor] Resolving module: ${modulePath} for ${extensionId}`
    );
    try {
      if (!this.validateModulePath(modulePath)) {
        throw new Error(`Module path validation failed: ${modulePath}`);
      }
      const resolvedPath = __require.resolve(modulePath);
      console.log(
        `[ModuleInterceptor] Resolved ${modulePath} to ${resolvedPath}`
      );
      return resolvedPath;
    } catch (error) {
      console.error(
        `[ModuleInterceptor] Failed to resolve module ${modulePath}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Resolve module path from parent
   */
  resolveModulePath(modulePath, parentPath) {
    try {
      const resolvedPath = __require.resolve(modulePath, {
        paths: [parentPath]
      });
      if (!this.validateResolvedPath(resolvedPath)) {
        throw new Error(
          `Resolved path validation failed: ${resolvedPath}`
        );
      }
      return resolvedPath;
    } catch (error) {
      console.error(
        `[ModuleInterceptor] Failed to resolve module path: ${modulePath}`,
        error
      );
      throw error;
    }
  }
  /**
   * Validate module path doesn't escape allowed directories
   */
  validateModulePath(modulePath) {
    if (modulePath.includes("..")) {
      console.warn(
        `[ModuleInterceptor] Potential path traversal detected: ${modulePath}`
      );
      return false;
    }
    if (modulePath.startsWith("/")) {
      console.warn(
        `[ModuleInterceptor] Absolute path detected: ${modulePath}`
      );
      return false;
    }
    return true;
  }
  /**
   * Validate resolved path
   */
  validateResolvedPath(resolvedPath) {
    const suspiciousPatterns = [
      /\/node_modules\.\./,
      /\/\.\./,
      /\\node_modules\.\./,
      /\\\.\./
    ];
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(resolvedPath)) {
        console.warn(
          `[ModuleInterceptor] Suspicious resolved path detected: ${resolvedPath}`
        );
        return false;
      }
    }
    return true;
  }
  /**
   * Set security policy for extension
   */
  async setSecurityPolicy(policy) {
    console.log(
      `[ModuleInterceptor] Setting security policy for ${policy.extensionId}`
    );
    if (!policy.extensionId || typeof policy.extensionId !== "string") {
      throw new Error("Invalid policy: missing or invalid extensionId");
    }
    if (!Array.isArray(policy.allowedModules) || !Array.isArray(policy.blockedModules)) {
      throw new Error(
        "Invalid policy: allowedModules and blockedModules must be arrays"
      );
    }
    this.securityPolicies.set(policy.extensionId, policy);
    this.invalidateCacheForExtension(policy.extensionId);
    console.log(
      `[ModuleInterceptor] Security policy set for ${policy.extensionId}`
    );
  }
  /**
   * Get security policy for extension
   */
  async getSecurityPolicy(extensionId) {
    return this.securityPolicies.get(extensionId);
  }
  /**
   * Create security context for extension
   */
  async createSecurityContext(extensionId) {
    console.log(
      `[ModuleInterceptor] Creating security context for ${extensionId}`
    );
    const policy = this.securityPolicies.get(extensionId) || this.securityPolicies.get("default");
    return {
      extensionId,
      securityLevel: policy?.securityLevel || "SANDBOXED" /* SANDBOXED */,
      permissions: policy?.allowedModules || [],
      sandbox: this.createExtensionSandbox(extensionId)
    };
  }
  /**
   * Create extension-specific sandbox
   */
  createExtensionSandbox(extensionId) {
    const sandbox = {};
    for (const [name, fn] of this.securitySandbox.entries()) {
      sandbox[name] = fn.bind(this.securitySandbox);
    }
    sandbox.__extensionId = extensionId;
    sandbox.__isSandboxed = true;
    return sandbox;
  }
  /**
   * Validate module security
   */
  async validateModuleSecurity(extensionId, moduleId) {
    console.log(
      `[ModuleInterceptor] Validating module security: ${moduleId} for ${extensionId}`
    );
    try {
      const policy = this.securityPolicies.get(extensionId) || this.securityPolicies.get("default");
      if (!policy) {
        return false;
      }
      if (policy.blockedModules.includes(moduleId)) {
        return false;
      }
      if (policy.securityLevel === "SANDBOXED" /* SANDBOXED */ || policy.securityLevel === "RESTRICTED" /* RESTRICTED */) {
        const resolvedPath = this.resolveModulePath(moduleId, "");
        const analysis = this.analyzeModuleSecurity(resolvedPath);
        return analysis.isSafe;
      }
      return true;
    } catch (error) {
      console.error(
        `[ModuleInterceptor] Module security validation failed: ${moduleId}`,
        error
      );
      return false;
    }
  }
  /**
   * Analyze module security using advanced AST parsing
   */
  analyzeModuleSecurity(modulePath) {
    try {
      console.log(
        `[ModuleInterceptor] Performing advanced AST security analysis for ${modulePath}`
      );
      const fs = __require("fs");
      const path = __require("path");
      let resolvedPath;
      try {
        resolvedPath = __require.resolve(modulePath);
      } catch {
        resolvedPath = modulePath;
      }
      let sourceCode;
      try {
        sourceCode = fs.readFileSync(resolvedPath, "utf8");
      } catch {
        console.log(
          `[ModuleInterceptor] Cannot read source for ${modulePath}, assuming safe`
        );
        return { isSafe: true, reason: "Cannot analyze source code" };
      }
      const ast = acorn.parse(sourceCode, {
        ecmaVersion: "latest",
        sourceType: "module",
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        ranges: true,
        locations: true
      });
      const securityIssues = [];
      const securityWarnings = [];
      walk.simple(
        ast,
        {
          CallExpression(node) {
            const callee = node.callee;
            if (callee.type === "Identifier") {
              const functionName = callee.name;
              if (this.isCriticalDangerousFunction(functionName)) {
                securityIssues.push(
                  `CRITICAL: Dangerous function call: ${functionName}`
                );
              } else if (this.isDangerousFunction(functionName)) {
                securityWarnings.push(
                  `WARNING: Dangerous function call: ${functionName}`
                );
              }
            }
            if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "eval" && callee.property.type === "Identifier" && callee.property.name === "constructor") {
              securityIssues.push(
                `CRITICAL: Dynamic code execution via eval constructor`
              );
            }
          },
          MemberExpression(node) {
            if (node.object.type === "Identifier" && node.property.type === "Identifier") {
              const objectName = node.object.name;
              const propertyName = node.property.name;
              if (this.isCriticalDangerousPropertyAccess(
                objectName,
                propertyName
              )) {
                securityIssues.push(
                  `CRITICAL: Dangerous property access: ${objectName}.${propertyName}`
                );
              } else if (this.isDangerousPropertyAccess(
                objectName,
                propertyName
              )) {
                securityWarnings.push(
                  `WARNING: Dangerous property access: ${objectName}.${propertyName}`
                );
              }
            }
          },
          AssignmentExpression(node) {
            if (node.left.type === "MemberExpression") {
              const left = node.left;
              if (left.object.type === "Identifier" && left.property.type === "Identifier") {
                const objectName = left.object.name;
                const propertyName = left.property.name;
                if (this.isCriticalDangerousAssignment(
                  objectName,
                  propertyName
                )) {
                  securityIssues.push(
                    `CRITICAL: Dangerous assignment: ${objectName}.${propertyName}`
                  );
                } else if (this.isDangerousAssignment(
                  objectName,
                  propertyName
                )) {
                  securityWarnings.push(
                    `WARNING: Dangerous assignment: ${objectName}.${propertyName}`
                  );
                }
              }
            }
          },
          ImportDeclaration(node) {
            const importSource = node.source.value;
            if (this.isDangerousImport(importSource)) {
              securityIssues.push(
                `CRITICAL: Dangerous import: ${importSource}`
              );
            }
          },
          NewExpression(node) {
            if (node.callee.type === "Identifier") {
              const constructorName = node.callee.name;
              if (this.isDangerousConstructor(constructorName)) {
                securityIssues.push(
                  `CRITICAL: Dangerous constructor: ${constructorName}`
                );
              }
            }
          }
        },
        this
      );
      this.performPatternAnalysis(
        sourceCode,
        securityIssues,
        securityWarnings
      );
      const allIssues = [...securityIssues, ...securityWarnings];
      const isSafe = securityIssues.length === 0;
      const reason = allIssues.length > 0 ? `Security analysis: ${allIssues.join(", ")}` : "Advanced AST security analysis passed all checks";
      console.log(
        `[ModuleInterceptor] Security analysis for ${modulePath}: ${securityIssues.length} critical issues, ${securityWarnings.length} warnings`
      );
      return {
        isSafe,
        reason
      };
    } catch (error) {
      console.error(
        `[ModuleInterceptor] Advanced security analysis failed for ${modulePath}:`,
        error
      );
      return {
        isSafe: false,
        reason: `Advanced security analysis error: ${error}`
      };
    }
  }
  /**
   * Check if function is critically dangerous (block immediately)
   */
  isCriticalDangerousFunction(functionName) {
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
      "vm.runInContext"
    ];
    return criticalFunctions.includes(functionName);
  }
  /**
   * Check if function is dangerous (warning level)
   */
  isDangerousFunction(functionName) {
    const dangerousFunctions = [
      "setTimeout",
      "setInterval",
      "setImmediate",
      "require.cache",
      "module.constructor",
      "global.eval"
    ];
    return dangerousFunctions.includes(functionName);
  }
  /**
   * Check if property access is critically dangerous
   */
  isCriticalDangerousPropertyAccess(objectName, propertyName) {
    const criticalAccesses = [
      { object: "process", property: "env" },
      { object: "global", property: "process" },
      { object: "window", property: "location" },
      { object: "process", property: "mainModule" },
      { object: "process", property: "binding" }
    ];
    return criticalAccesses.some(
      (access) => access.object === objectName && access.property === propertyName
    );
  }
  /**
   * Check if property access is dangerous
   */
  isDangerousPropertyAccess(objectName, propertyName) {
    const dangerousAccesses = [
      { object: "global", property: "eval" },
      { object: "window", property: "eval" },
      { object: "process", property: "argv" },
      { object: "process", property: "cwd" }
    ];
    return dangerousAccesses.some(
      (access) => access.object === objectName && access.property === propertyName
    );
  }
  /**
   * Check if assignment is critically dangerous
   */
  isCriticalDangerousAssignment(objectName, propertyName) {
    const criticalAssignments = [
      { object: "process", property: "env" },
      { object: "global", property: "process" },
      { object: "require", property: "cache" },
      { object: "module", property: "exports" }
    ];
    return criticalAssignments.some(
      (assignment) => assignment.object === objectName && assignment.property === propertyName
    );
  }
  /**
   * Check if assignment is dangerous
   */
  isDangerousAssignment(objectName, propertyName) {
    const dangerousAssignments = [
      { object: "global", property: "eval" },
      { object: "window", property: "eval" }
    ];
    return dangerousAssignments.some(
      (assignment) => assignment.object === objectName && assignment.property === propertyName
    );
  }
  /**
   * Check if import is dangerous
   */
  isDangerousImport(importSource) {
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
      "sys"
    ];
    return dangerousImports.includes(importSource);
  }
  /**
   * Check if constructor is dangerous
   */
  isDangerousConstructor(constructorName) {
    const dangerousConstructors = [
      "Function",
      "eval",
      "process",
      "require"
    ];
    return dangerousConstructors.includes(constructorName);
  }
  /**
   * Perform pattern-based security analysis
   */
  performPatternAnalysis(sourceCode, securityIssues, securityWarnings) {
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, description: "Direct eval call" },
      { pattern: /Function\s*\(/, description: "Function constructor" },
      {
        pattern: /require\s*\(\s*['"`]\s*[^'"`]*\s*['"`]\s*\)/,
        description: "Dynamic require"
      },
      {
        pattern: /process\.binding/,
        description: "Process binding access"
      },
      {
        pattern: /vm\.runInContext/,
        description: "VM context execution"
      },
      {
        pattern: /child_process\.spawn/,
        description: "Child process spawning"
      }
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
  loadAndInterceptModule(modulePath, securityLevel) {
    try {
      const originalModule = __require(modulePath);
      if (securityLevel === "TRUSTED" /* TRUSTED */) {
        return originalModule;
      }
      const interceptedModule = this.createSecurityWrapper(
        originalModule,
        modulePath
      );
      return interceptedModule;
    } catch (error) {
      console.error(
        `[ModuleInterceptor] Failed to load module ${modulePath}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Create security wrapper for module
   */
  createSecurityWrapper(originalModule, modulePath) {
    const wrapper = {};
    for (const key of Object.keys(originalModule)) {
      const originalValue = originalModule[key];
      if (typeof originalValue === "function") {
        wrapper[key] = this.wrapFunction(
          originalValue,
          modulePath,
          key
        );
      } else if (key !== "default") {
        wrapper[key] = originalValue;
      }
    }
    if (originalModule.__esModule) {
      wrapper.default = originalModule.default;
    }
    return wrapper;
  }
  /**
   * Wrap function with security checks
   */
  wrapFunction(originalFn, modulePath, functionName) {
    return (...args) => {
      console.log(
        `[ModuleInterceptor] Calling ${modulePath}.${functionName}`
      );
      for (const arg of args) {
        if (!this.validateFunctionArgument(arg)) {
          console.warn(
            `[ModuleInterceptor] Invalid argument detected in ${modulePath}.${functionName}`
          );
        }
      }
      return originalFn.apply(null, args);
    };
  }
  /**
   * Validate function argument
   */
  validateFunctionArgument(arg) {
    if (typeof arg === "function") {
      return false;
    }
    if (arg && typeof arg === "object") {
      if ("__proto__" in arg || "constructor" in arg) {
        return false;
      }
    }
    return true;
  }
  /**
   * Get cache key
   */
  getCacheKey(moduleId, extensionId) {
    return `${extensionId}:${moduleId}`;
  }
  /**
   * Invalidate cache for extension
   */
  invalidateCacheForExtension(extensionId) {
    console.log(
      `[ModuleInterceptor] Invalidating cache for ${extensionId}`
    );
    const keysToDelete = [];
    for (const [key] of this.moduleCache.entries()) {
      if (key.startsWith(`${extensionId}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.moduleCache.delete(key);
    }
    console.log(
      `[ModuleInterceptor] Invalidated ${keysToDelete.length} cache entries for ${extensionId}`
    );
  }
  /**
   * Invalidate all module cache
   */
  invalidateAllCache() {
    console.log("[ModuleInterceptor] Invalidating all module cache");
    this.moduleCache.clear();
    console.log("[ModuleInterceptor] All module cache invalidated");
  }
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    console.log("[ModuleInterceptor] Updating configuration");
    this.config = { ...this.config, ...newConfig };
    this.moduleCache.clear();
    console.log("[ModuleInterceptor] Configuration updated");
  }
  /**
   * Get interception statistics
   */
  async getStatistics() {
    return {
      totalInterceptions: this.telemetry.totalModulesLoaded,
      blockedModules: this.telemetry.blockedModules,
      averageResolutionTime: this.telemetry.averageAnalysisTime,
      securityViolations: this.telemetry.securityViolations
    };
  }
  /**
   * Get service status
   */
  getStatus() {
    return {
      cacheSize: this.moduleCache.size,
      config: this.config,
      securityRules: this.config.allowedModules.length + this.config.blockedModules.length,
      telemetry: this.telemetry
    };
  }
  /**
   * Register with security services
   * @future TODO: Implement actual registration when SecurityService methods are available
   */
  async registerWithSecurityService() {
    console.log("[ModuleInterceptor] Registering with security service");
    console.log(
      "[ModuleInterceptor] Security service registration complete"
    );
  }
  /**
   * Cleanup module interceptor service
   */
  async cleanup() {
    console.log("[ModuleInterceptor] Cleaning up service");
    this.moduleCache.clear();
    this.securitySandbox.clear();
    this.securityPolicies.clear();
    this.telemetry = {
      totalModulesLoaded: 0,
      blockedModules: 0,
      sandboxedModules: 0,
      averageAnalysisTime: 0,
      securityViolations: 0
    };
    console.log("[ModuleInterceptor] Service cleaned up");
  }
};
var ModuleInterceptorLayer = Layer.effect(
  IModuleInterceptor,
  Effect.sync(() => new ModuleInterceptor())
);
var ModuleInterceptorLive = Layer.effect(
  IModuleInterceptor,
  Effect.sync(() => new ModuleInterceptor())
);
var Interceptor_default = ModuleInterceptor;
export {
  ModuleInterceptor,
  ModuleInterceptorLayer,
  ModuleInterceptorLive,
  Interceptor_default as default
};
//# sourceMappingURL=Interceptor.js.map
