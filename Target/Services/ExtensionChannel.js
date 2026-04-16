var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/ExtensionChannel.ts
var ExtensionChannel = class {
  constructor(extensionHostService) {
    this.extensionHostService = extensionHostService;
  }
  extensionHostService;
  static {
    __name(this, "ExtensionChannel");
  }
  /**
   * Handle extension-related calls
   */
  async call(ctx, command, arg, cancellationToken) {
    console.log(`[ExtensionChannel] Handling call: ${command}`);
    switch (command) {
      case "activateExtension":
        return await this.handleActivateExtension(arg);
      case "deactivateExtension":
        return await this.handleDeactivateExtension(arg);
      case "getExtensionExports":
        return await this.handleGetExtensionExports(arg);
      case "getExtensionStatus":
        return await this.handleGetExtensionStatus(arg);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
  /**
   * Handle extension activation
   */
  async handleActivateExtension(arg) {
    const { extensionId, activationEvent } = arg;
    if (!extensionId || !activationEvent) {
      throw new Error("Missing extensionId or activationEvent");
    }
    console.log(`[ExtensionChannel] Activating extension: ${extensionId}`);
    try {
      const activatedExtension = await this.extensionHostService.activateExtension(extensionId, {
        startup: true,
        activationEvent,
        extensionId
      });
      return {
        success: true,
        activationTimes: activatedExtension.activationTimes,
        exports: activatedExtension.exports
      };
    } catch (error) {
      console.error(
        `[ExtensionChannel] Failed to activate extension ${extensionId}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Handle extension deactivation
   */
  async handleDeactivateExtension(arg) {
    const { extensionId } = arg;
    if (!extensionId) {
      throw new Error("Missing extensionId");
    }
    console.log(
      `[ExtensionChannel] Deactivating extension: ${extensionId}`
    );
    try {
      await this.extensionHostService.deactivateExtension(extensionId);
      return {
        success: true,
        extensionId
      };
    } catch (error) {
      console.error(
        `[ExtensionChannel] Failed to deactivate extension ${extensionId}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Get extension exports
   */
  async handleGetExtensionExports(arg) {
    const { extensionId } = arg;
    if (!extensionId) {
      throw new Error("Missing extensionId");
    }
    const activatedExtension = this.extensionHostService.getActivatedExtension(extensionId);
    if (!activatedExtension) {
      throw new Error(`Extension ${extensionId} not activated`);
    }
    return {
      success: true,
      exports: activatedExtension.exports
    };
  }
  /**
   * Get extension status
   */
  async handleGetExtensionStatus(arg) {
    const { extensionId } = arg;
    if (!extensionId) {
      throw new Error("Missing extensionId");
    }
    const isActivated = this.extensionHostService.isActivated(extensionId);
    const activatedExtension = this.extensionHostService.getActivatedExtension(extensionId);
    return {
      success: true,
      activated: isActivated,
      activationTimes: activatedExtension?.activationTimes,
      extensionId
    };
  }
  /**
   * Handle extension events
   */
  listen(ctx, event, arg) {
    console.log(`[ExtensionChannel] Listening to event: ${event}`);
    throw new Error(`Event listening not implemented: ${event}`);
  }
};
export {
  ExtensionChannel
};
//# sourceMappingURL=ExtensionChannel.js.map
