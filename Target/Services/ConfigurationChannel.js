var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IConfigurationService.ts
import { Context } from "effect";
var ConfigurationScope = /* @__PURE__ */ ((ConfigurationScope2) => {
  ConfigurationScope2["APPLICATION"] = "APPLICATION";
  ConfigurationScope2["WORKSPACE"] = "WORKSPACE";
  ConfigurationScope2["PROFILE"] = "PROFILE";
  return ConfigurationScope2;
})(ConfigurationScope || {});
var IConfigurationService = Context.Tag(
  "IConfigurationService"
);

// Source/Services/ConfigurationChannel.ts
var ConfigurationChannel = class {
  constructor(configurationService) {
    this.configurationService = configurationService;
  }
  configurationService;
  static {
    __name(this, "ConfigurationChannel");
  }
  /**
   * Handle configuration-related calls
   */
  async call(ctx, command, arg, cancellationToken) {
    console.log(`[ConfigurationChannel] Handling call: ${command}`);
    switch (command) {
      case "getValue":
        return await this.handleGetValue(arg);
      case "setValue":
        return await this.handleSetValue(arg);
      case "updateValue":
        return await this.handleUpdateValue(arg);
      case "hasKey":
        return await this.handleHasKey(arg);
      case "getConfigurationKeys":
        return await this.handleGetConfigurationKeys(arg);
      case "getAllValues":
        return await this.handleGetAllValues(arg);
      case "reloadConfiguration":
        return await this.handleReloadConfiguration(arg);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
  /**
   * Handle getValue call
   */
  async handleGetValue(arg) {
    const {
      key,
      scope = "APPLICATION" /* APPLICATION */,
      defaultValue
    } = arg;
    if (!key) {
      throw new Error("Missing key parameter");
    }
    try {
      const value = this.configurationService.getValue(
        key,
        scope,
        defaultValue
      );
      return {
        success: true,
        value,
        key,
        scope
      };
    } catch (error) {
      console.error(
        `[ConfigurationChannel] Failed to get value for key ${key}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Handle setValue call
   */
  async handleSetValue(arg) {
    const { key, value, scope = "APPLICATION" /* APPLICATION */ } = arg;
    if (!key) {
      throw new Error("Missing key parameter");
    }
    try {
      await this.configurationService.setValue(key, value, scope);
      return {
        success: true,
        key,
        value,
        scope
      };
    } catch (error) {
      console.error(
        `[ConfigurationChannel] Failed to set value for key ${key}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Handle updateValue call
   */
  async handleUpdateValue(arg) {
    const { key, updateFn, scope = "APPLICATION" /* APPLICATION */ } = arg;
    if (!key || !updateFn) {
      throw new Error("Missing key or updateFn parameter");
    }
    try {
      await this.configurationService.updateValue(key, updateFn, scope);
      return {
        success: true,
        key,
        scope
      };
    } catch (error) {
      console.error(
        `[ConfigurationChannel] Failed to update value for key ${key}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Handle hasKey call
   */
  async handleHasKey(arg) {
    const { key, scope = "APPLICATION" /* APPLICATION */ } = arg;
    if (!key) {
      throw new Error("Missing key parameter");
    }
    try {
      const hasKey = this.configurationService.hasKey(key, scope);
      return {
        success: true,
        hasKey,
        key,
        scope
      };
    } catch (error) {
      console.error(
        `[ConfigurationChannel] Failed to check key ${key}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Handle getConfigurationKeys call
   */
  async handleGetConfigurationKeys(arg) {
    const { scope = "APPLICATION" /* APPLICATION */ } = arg;
    try {
      const keys = this.configurationService.getConfigurationKeys(scope);
      return {
        success: true,
        keys,
        scope
      };
    } catch (error) {
      console.error(
        `[ConfigurationChannel] Failed to get configuration keys for scope ${scope}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Handle getAllValues call
   */
  async handleGetAllValues(arg) {
    const { scope = "APPLICATION" /* APPLICATION */ } = arg;
    try {
      const values = await this.configurationService.getAllValues(scope);
      return {
        success: true,
        values,
        scope
      };
    } catch (error) {
      console.error(
        `[ConfigurationChannel] Failed to get all values for scope ${scope}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Handle reloadConfiguration call
   */
  async handleReloadConfiguration(arg) {
    try {
      await this.configurationService.reloadConfiguration();
      return {
        success: true
      };
    } catch (error) {
      console.error(
        "[ConfigurationChannel] Failed to reload configuration:",
        error
      );
      throw error;
    }
  }
  /**
   * Handle configuration events
   * @future TODO: Implement full event streaming with proper cancellation
   */
  listen(ctx, event, arg) {
    console.log(`[ConfigurationChannel] Listening to event: ${event}`);
    if (event === "onDidChangeConfiguration") {
      return {
        dispose: /* @__PURE__ */ __name(() => {
          console.log(
            `[ConfigurationChannel] Disposed listener for ${event}`
          );
        }, "dispose")
      };
    }
    throw new Error(`Unknown event: ${event}`);
  }
  /**
   * Subscribe to configuration changes
   */
  subscribeToChanges(ctx, callback) {
    console.log(
      "[ConfigurationChannel] Subscribing to configuration changes"
    );
    this.configurationService.onDidChangeConfiguration((event) => {
      callback([
        {
          key: "configuration",
          changes: event.affectsConfiguration || [],
          scope: event.scope
        }
      ]);
    });
    return () => {
      console.log(
        "[ConfigurationChannel] Unsubscribed from configuration changes"
      );
    };
  }
};
export {
  ConfigurationChannel
};
//# sourceMappingURL=ConfigurationChannel.js.map
