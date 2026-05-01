var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// Source/Interfaces/IModuleInterceptorService.ts
import { Context } from "effect";
var SecurityLevel = /* @__PURE__ */ ((SecurityLevel3) => {
  SecurityLevel3["TRUSTED"] = "TRUSTED";
  SecurityLevel3["SANDBOXED"] = "SANDBOXED";
  SecurityLevel3["RESTRICTED"] = "RESTRICTED";
  SecurityLevel3["BLOCKED"] = "BLOCKED";
  return SecurityLevel3;
})(SecurityLevel || {});
var IModuleInterceptorService = Context.Tag(
  "IModuleInterceptorService"
);

// Source/Services/ModuleInterceptorService.ts
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { Effect, Layer } from "effect";
var ModuleInterceptorService = class {
  static {
    __name(this, "ModuleInterceptorService");
  }
  _serviceBrand;
  config;
  moduleCache;
  securitySandbox;
  constructor() {
    console.log(
      "[ModuleInterceptorService] Initializing module interceptor"
    );
    this.config = this.loadDefaultConfig();
    this.moduleCache = /* @__PURE__ */ new Map();
    this.securitySandbox = this.createSecuritySandbox();
    console.log(
      "[ModuleInterceptorService] Module interceptor initialized"
    );
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
        "buffer"
      ],
      blockedModules: [
        "fs",
        "child_process",
        "net",
        "http",
        "https",
        "os",
        "crypto"
      ]
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
    sandbox.set("setTimeout", setTimeout.bind(global));
    sandbox.set("setInterval", setInterval.bind(global));
    sandbox.set("clearTimeout", clearTimeout.bind(global));
    sandbox.set("clearInterval", clearInterval.bind(global));
    sandbox.set("JSON.parse", JSON.parse);
    sandbox.set("JSON.stringify", JSON.stringify);
    return sandbox;
  }
  /**
   * Intercept module require calls
   */
  interceptRequire(modulePath, parentPath) {
    console.log(
      `[ModuleInterceptorService] Intercepting require: ${modulePath} from ${parentPath}`
    );
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }
    if (!this.validateModuleAccess(modulePath, parentPath)) {
      throw new Error(`Module access denied: ${modulePath}`);
    }
    const moduleSecurity = this.analyzeModuleSecurity(modulePath);
    if (!moduleSecurity.isSafe) {
      throw new Error(
        `Module security violation: ${modulePath} - ${moduleSecurity.reason}`
      );
    }
    const interceptedModule = this.loadAndInterceptModule(modulePath);
    this.moduleCache.set(modulePath, interceptedModule);
    console.log(
      `[ModuleInterceptorService] Module ${modulePath} intercepted successfully`
    );
    return interceptedModule;
  }
  /**
   * Validate module access permissions
   */
  validateModuleAccess(modulePath, parentPath) {
    if (this.config.blockedModules.includes(modulePath)) {
      console.warn(
        `[ModuleInterceptorService] Blocked module access: ${modulePath}`
      );
      return false;
    }
    if (this.config.allowedModules.includes(modulePath)) {
      return true;
    }
    if (this.isNodeBuiltin(modulePath) && !this.config.allowNodeBuiltins) {
      console.warn(
        `[ModuleInterceptorService] Node built-in module access denied: ${modulePath}`
      );
      return false;
    }
    return true;
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
      "querystring"
    ];
    return builtins.includes(modulePath);
  }
  /**
   * Analyze module security using advanced AST parsing
   */
  analyzeModuleSecurity(modulePath) {
    try {
      console.log(
        `[ModuleInterceptorService] Performing advanced AST security analysis for ${modulePath}`
      );
      const fs = __require("fs");
      const path = __require("path");
      const resolvedPath = __require.resolve(modulePath);
      const sourceCode = fs.readFileSync(resolvedPath, "utf8");
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
        `[ModuleInterceptorService] Security analysis for ${modulePath}: ${securityIssues.length} critical issues, ${securityWarnings.length} warnings`
      );
      return {
        isSafe,
        reason
      };
    } catch (error) {
      console.error(
        `[ModuleInterceptorService] Advanced security analysis failed for ${modulePath}:`,
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
   * Check if property access is dangerous
   */
  isDangerousPropertyAccess(objectName, propertyName) {
    const dangerousAccesses = [
      { object: "process", property: "env" },
      { object: "global", property: "process" },
      { object: "window", property: "location" }
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
  loadAndInterceptModule(modulePath) {
    try {
      const originalModule = __require(modulePath);
      const interceptedModule = this.createSecurityWrapper(
        originalModule,
        modulePath
      );
      return interceptedModule;
    } catch (error) {
      console.error(
        `[ModuleInterceptorService] Failed to load module ${modulePath}:`,
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
      } else {
        wrapper[key] = originalValue;
      }
    }
    return wrapper;
  }
  /**
   * Wrap function with security checks
   */
  wrapFunction(originalFn, modulePath, functionName) {
    return (...args) => {
      console.log(
        `[ModuleInterceptorService] Calling ${modulePath}.${functionName}`
      );
      return originalFn.apply(null, args);
    };
  }
  /**
   * Resolve module path
   */
  resolveModule(modulePath, parentPath) {
    console.log(
      `[ModuleInterceptorService] Resolving module: ${modulePath} from ${parentPath}`
    );
    try {
      const resolvedPath = __require.resolve(modulePath, {
        paths: [parentPath]
      });
      console.log(
        `[ModuleInterceptorService] Resolved ${modulePath} to ${resolvedPath}`
      );
      return resolvedPath;
    } catch (error) {
      console.error(
        `[ModuleInterceptorService] Failed to resolve module ${modulePath}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Create extension context with isolated environment
   */
  createExtensionContext(extensionId) {
    console.log(
      `[ModuleInterceptorService] Creating extension context for ${extensionId}`
    );
    const context = {
      extensionId,
      globalState: /* @__PURE__ */ new Map(),
      workspaceState: /* @__PURE__ */ new Map(),
      subscriptions: [],
      asAbsolutePath: /* @__PURE__ */ __name((relativePath) => {
        return `/extensions/${extensionId}/${relativePath}`;
      }, "asAbsolutePath")
    };
    console.log(
      `[ModuleInterceptorService] Extension context created for ${extensionId}`
    );
    return context;
  }
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    console.log("[ModuleInterceptorService] Updating configuration");
    this.config = { ...this.config, ...newConfig };
    this.moduleCache.clear();
    console.log("[ModuleInterceptorService] Configuration updated");
  }
  /**
   * Get service status
   */
  getStatus() {
    return {
      cacheSize: this.moduleCache.size,
      config: this.config,
      securityRules: this.config.allowedModules.length + this.config.blockedModules.length
    };
  }
};
var ModuleInterceptorServiceLayer = Layer.effect(
  IModuleInterceptorService,
  Effect.sync(() => new ModuleInterceptorService())
);
var ModuleInterceptorServiceLive = Layer.effect(
  IModuleInterceptorService,
  Effect.sync(() => new ModuleInterceptorService())
);
var ModuleInterceptorService_default = ModuleInterceptorService;
export {
  ModuleInterceptorService,
  ModuleInterceptorServiceLayer,
  ModuleInterceptorServiceLive,
  ModuleInterceptorService_default as default
};
//# sourceMappingURL=ModuleInterceptorService.js.map
