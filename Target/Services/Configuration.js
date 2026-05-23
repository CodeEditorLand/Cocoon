var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/I/Configuration/Service.ts
import { Context } from "effect";
var ConfigurationScope = /* @__PURE__ */ ((ConfigurationScope3) => {
  ConfigurationScope3["APPLICATION"] = "APPLICATION";
  ConfigurationScope3["WORKSPACE"] = "WORKSPACE";
  ConfigurationScope3["PROFILE"] = "PROFILE";
  return ConfigurationScope3;
})(ConfigurationScope || {});
var IConfigurationService = Context.Tag(
  "IConfigurationService"
);

// Source/Interfaces/I/Mountain/Client/Service.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/Configuration.ts
import { CocoonDevLog } from "Dev/Log.js";
import { Effect as Effect2, Layer } from "effect";
var ConfigurationScope2 = /* @__PURE__ */ ((ConfigurationScope3) => {
  ConfigurationScope3["APPLICATION"] = "APPLICATION";
  ConfigurationScope3["WORKSPACE"] = "WORKSPACE";
  ConfigurationScope3["PROFILE"] = "PROFILE";
  return ConfigurationScope3;
})(ConfigurationScope2 || {});
var Configuration = class {
  static {
    __name(this, "Configuration");
  }
  _serviceBrand;
  configuration;
  mountainClient;
  listeners;
  constructor(mountainClient) {
    this._serviceBrand = void 0;
    this.mountainClient = mountainClient;
    this.configuration = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Map();
    CocoonDevLog(
      "configuration",
      "[ConfigurationService] Initializing configuration service with Universal Spine"
    );
  }
  /**
   * Initialize the configuration service by fetching from Mountain
   */
  async initialize() {
    CocoonDevLog(
      "configuration",
      "[ConfigurationService] Loading initial configuration from Spine..."
    );
    try {
      const configData = await this.mountainClient.sendRequest(
        "config.reload",
        {}
      );
      if (configData?.application) {
        this.configuration.set(
          "APPLICATION" /* APPLICATION */,
          configData.application
        );
      }
      if (configData?.workspace) {
        this.configuration.set(
          "WORKSPACE" /* WORKSPACE */,
          configData.workspace
        );
      }
      if (configData?.profile) {
        this.configuration.set(
          "PROFILE" /* PROFILE */,
          configData.profile
        );
      }
      CocoonDevLog(
        "configuration",
        "[ConfigurationService] Configuration loaded from Spine",
        configData
      );
    } catch (error) {
      CocoonDevLog(
        "configuration",
        "[ConfigurationService] Failed to load initial configuration from Spine:",
        error
      );
      this.configuration.set("APPLICATION" /* APPLICATION */, {
        _version: 1,
        _timestamp: Date.now(),
        window: {
          zoomLevel: 0,
          theme: "dark"
        },
        editor: {
          fontSize: 14,
          lineNumbers: "on"
        }
      });
      this.configuration.set("WORKSPACE" /* WORKSPACE */, {
        _version: 1,
        _timestamp: Date.now()
      });
      this.configuration.set("PROFILE" /* PROFILE */, {
        _version: 1,
        _timestamp: Date.now()
      });
    }
  }
  /**
   * Get configuration value
   */
  getValue(key, scope = "APPLICATION" /* APPLICATION */, defaultValue) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return defaultValue;
    }
    const value = this.getNestedValue(scopeConfig, key);
    return value !== void 0 ? value : defaultValue;
  }
  /**
   * Set configuration value
   */
  async setValue(key, value, scope) {
    if (!this.validateConfigurationKey(key)) {
      throw new Error(`Invalid configuration key: ${key}`);
    }
    if (!this.validateConfigurationValue(key, value)) {
      throw new Error(
        `Invalid configuration value for key ${key}: ${value}`
      );
    }
    let scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      scopeConfig = {};
      this.configuration.set(scope, scopeConfig);
    }
    const oldValue = this.getNestedValue(scopeConfig, key);
    if (oldValue !== value) {
      this.setNestedValue(scopeConfig, key, value);
      scopeConfig._timestamp = Date.now();
      scopeConfig._version = (scopeConfig._version || 0) + 1;
      try {
        let spineScope = 0;
        if (scope === "WORKSPACE" /* WORKSPACE */) spineScope = 1;
        if (scope === "PROFILE" /* PROFILE */) spineScope = 2;
        await this.mountainClient.sendRequest("config.update", {
          key,
          value,
          scope: spineScope
        });
        CocoonDevLog(
          "configuration",
          `[ConfigurationService] Configuration updated: ${key} = ${value}`
        );
        this.notifyConfigurationChange([key], scope);
      } catch (error) {
        CocoonDevLog(
          "configuration",
          `[ConfigurationService] Failed to update configuration: ${key}`,
          error
        );
        await this.handleConfigurationConflict(
          error,
          key,
          value,
          scope
        );
      }
    }
  }
  /**
   * Validate configuration key
   */
  validateConfigurationKey(key) {
    if (!key || key.trim().length === 0) {
      return false;
    }
    const invalidChars = /[^a-zA-Z0-9._-]/;
    if (invalidChars.test(key)) {
      return false;
    }
    if (key.startsWith(".") || key.endsWith(".")) {
      return false;
    }
    if (key.includes("..")) {
      return false;
    }
    return true;
  }
  /**
   * Validate configuration value
   */
  validateConfigurationValue(key, value) {
    if (value === void 0) {
      return false;
    }
    if (key.includes("zoomLevel") || key.includes("fontSize")) {
      if (typeof value !== "number" || !isFinite(value)) {
        return false;
      }
      if (key.includes("zoomLevel")) {
        return value >= -8 && value <= 9;
      }
      if (key.includes("fontSize")) {
        return value >= 6 && value <= 100;
      }
    }
    if (key.includes("enable") || key.includes("show") || key.includes("visible")) {
      return typeof value === "boolean";
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  }
  /**
   * Validate entire configuration scope
   */
  validateScopeConfiguration(scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return true;
    }
    const keys = [];
    this.collectKeys(scopeConfig, "", keys);
    for (const key of keys) {
      const value = this.getNestedValue(scopeConfig, key);
      if (!this.validateConfigurationKey(key) || !this.validateConfigurationValue(key, value)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Update configuration value
   */
  async updateValue(key, updateFn, scope) {
    const currentValue = this.getValue(key, scope);
    const newValue = updateFn(currentValue);
    await this.setValue(key, newValue, scope);
  }
  /**
   * Check if configuration key exists
   */
  hasKey(key, scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return false;
    }
    const value = this.getNestedValue(scopeConfig, key);
    return value !== void 0;
  }
  /**
   * Get all configuration keys for a scope
   */
  getConfigurationKeys(scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return [];
    }
    const keys = [];
    this.collectKeys(scopeConfig, "", keys);
    return keys;
  }
  /**
   * Get all configuration values for a scope
   */
  async getAllValues(scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return {};
    }
    const result = {};
    this.collectKeys(scopeConfig, "", Object.keys(result));
    for (const key of Object.keys(result)) {
      result[key] = this.getNestedValue(scopeConfig, key);
    }
    return result;
  }
  /**
   * Inspect configuration value
   */
  inspect(key, scope = "APPLICATION" /* APPLICATION */) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return { key };
    }
    const value = this.getNestedValue(scopeConfig, key);
    return {
      key,
      value
    };
  }
  /**
   * Listen for configuration changes
   */
  onDidChangeConfiguration(callback) {
    CocoonDevLog(
      "configuration",
      "[ConfigurationService] Registering configuration change listener"
    );
    const listenerId = `listener_${Date.now()}_${Math.random()}`;
    let globalListeners = this.listeners.get("*");
    if (!globalListeners) {
      globalListeners = [];
      this.listeners.set("*", globalListeners);
    }
    globalListeners.push(callback);
    CocoonDevLog(
      "configuration",
      `[ConfigurationService] Configuration change listener registered: ${listenerId}`
    );
  }
  /**
   * Reload configuration from Mountain
   */
  async reloadConfiguration() {
    CocoonDevLog(
      "configuration",
      "[ConfigurationService] Reloading configuration from Mountain"
    );
    try {
      this.listeners.clear();
      await this.initialize();
      CocoonDevLog(
        "configuration",
        "[ConfigurationService] Configuration reloaded successfully"
      );
    } catch (error) {
      CocoonDevLog(
        "configuration",
        "[ConfigurationService] Failed to reload configuration:",
        error
      );
      throw error;
    }
  }
  /**
   * Handle configuration conflicts with retry logic
   */
  async handleConfigurationConflict(_error, key, value, scope) {
    CocoonDevLog(
      "configuration",
      "[ConfigurationService] Configuration conflict detected, implementing retry logic"
    );
    const maxRetries = 3;
    const baseDelay = 100;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      CocoonDevLog(
        "configuration",
        `[ConfigurationService] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        await this.initialize();
        let scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
          scopeConfig = {};
          this.configuration.set(scope, scopeConfig);
        }
        this.setNestedValue(scopeConfig, key, value);
        scopeConfig._timestamp = Date.now();
        scopeConfig._version = (scopeConfig._version || 0) + 1;
        let spineScope = 0;
        if (scope === "WORKSPACE" /* WORKSPACE */) spineScope = 1;
        if (scope === "PROFILE" /* PROFILE */) spineScope = 2;
        await this.mountainClient.sendRequest("config.update", {
          key,
          value,
          scope: spineScope
        });
        CocoonDevLog(
          "configuration",
          "[ConfigurationService] Configuration saved successfully after retry"
        );
        return;
      } catch (retryError) {
        CocoonDevLog(
          "configuration",
          `[ConfigurationService] Retry attempt ${attempt} failed:`,
          retryError
        );
        if (attempt === maxRetries) {
          CocoonDevLog(
            "configuration",
            "[ConfigurationService] All retry attempts failed, configuration may be out of sync"
          );
          throw new Error(
            `Configuration synchronization failed after ${maxRetries} attempts: ${retryError}`
          );
        }
      }
    }
  }
  /**
   * Cleanup configuration service
   */
  async cleanup() {
    CocoonDevLog(
      "configuration",
      "[ConfigurationService] Cleaning up configuration service"
    );
    this.listeners.clear();
    this.configuration.clear();
    CocoonDevLog(
      "configuration",
      "[ConfigurationService] Configuration service cleaned up"
    );
  }
  /**
   * Get nested value from configuration object
   */
  getNestedValue(obj, key) {
    const keys = key.split(".");
    let current = obj;
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return void 0;
      }
    }
    return current;
  }
  /**
   * Set nested value in configuration object
   */
  setNestedValue(obj, key, value) {
    const keys = key.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!k) continue;
      if (!(k in current) || typeof current[k] !== "object") {
        current[k] = {};
      }
      current = current[k];
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }
  /**
   * Collect all configuration keys
   */
  collectKeys(obj, prefix, keys) {
    for (const key in obj) {
      if (key.startsWith("_")) continue;
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        this.collectKeys(obj[key], fullKey, keys);
      } else {
        keys.push(fullKey);
      }
    }
  }
  /**
   * Notify configuration change listeners
   */
  notifyConfigurationChange(keys, scope) {
    for (const key of keys) {
      const eventKey = `${scope}.${key}`;
      const listeners = this.listeners.get(eventKey);
      const globalListeners = this.listeners.get("*");
      const allListeners = [
        ...listeners || [],
        ...globalListeners || []
      ];
      if (allListeners.length > 0) {
        for (const listener of allListeners) {
          try {
            listener([{ key, scope }]);
          } catch (error) {
            CocoonDevLog(
              "configuration",
              `[ConfigurationService] Error in listener for ${eventKey}:`,
              error
            );
          }
        }
      }
    }
  }
};
var ConfigurationLayer = Layer.effect(
  IConfigurationService,
  Effect2.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    const configService = new Configuration(mountainClient);
    yield* Effect2.promise(() => configService.initialize());
    return configService;
  })
);
var ConfigurationLive = ConfigurationLayer;
export {
  Configuration,
  ConfigurationLayer,
  ConfigurationLive
};
//# sourceMappingURL=Configuration.js.map
