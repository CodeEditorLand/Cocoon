var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/Result.ts
var Result = {
  Ok: /* @__PURE__ */ __name((Value) => ({ success: true, value: Value }), "Ok"),
  Err: /* @__PURE__ */ __name((Error2) => ({ success: false, error: Error2 }), "Err"),
  IsOk: /* @__PURE__ */ __name((R) => R.success, "IsOk"),
  IsErr: /* @__PURE__ */ __name((R) => !R.success, "IsErr")
};
var Ok = Result.Ok;
var Err = Result.Err;
var Result_default = Result;

// Source/IPC/Handler.ts
var { CancellationTokenSource } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");
var OperationType = /* @__PURE__ */ ((OperationType2) => {
  OperationType2["Query"] = "query";
  OperationType2["Mutation"] = "mutation";
  OperationType2["Subscription"] = "subscription";
  OperationType2["Notification"] = "notification";
  return OperationType2;
})(OperationType || {});
var IPCHandler = class {
  static {
    __name(this, "IPCHandler");
  }
  handlers;
  pendingRequests;
  handlerStats;
  logger;
  config;
  activeRequestCount;
  constructor(logger, config) {
    this.handlers = /* @__PURE__ */ new Map();
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.handlerStats = /* @__PURE__ */ new Map();
    this.logger = logger;
    this.activeRequestCount = 0;
    this.config = {
      enableLogging: config?.enableLogging ?? true,
      enableMetrics: config?.enableMetrics ?? true,
      defaultTimeout: config?.defaultTimeout ?? 3e4,
      maxConcurrentRequests: config?.maxConcurrentRequests ?? 100
    };
    this.logger.info("IPCHandler initialized", config);
  }
  /**
   * Registers a handler for the specified method
   *
   * @param method - The method name to register handler for
   * @param handler - The handler function to execute
   * @param options - Optional registration settings
   * @returns Result indicating success or failure
   */
  async RegisterHandler(method, handler, options) {
    try {
      if (!method || method.trim().length === 0) {
        return Result.Err(new Error("Method name cannot be empty"));
      }
      if (typeof handler !== "function") {
        return Result.Err(new Error("Handler must be a function"));
      }
      if (this.handlers.has(method)) {
        const warning = `Handler for method '${method}' already exists. Overwriting.`;
        this.logger.warn(warning);
      }
      const registration = {
        handler,
        method,
        registeredAt: Date.now(),
        description: options?.description
      };
      if (this.config.enableMetrics) {
        this.handlerStats.set(method, {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageLatency: 0,
          lastCalled: 0
        });
      }
      this.handlers.set(method, registration);
      this.logger.info(
        `Handler registered successfully for method: ${method}`,
        { description: options?.description }
      );
      return Result.Ok(void 0);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to register handler for method: ${method}`,
        err
      );
      return Result.Err(err);
    }
  }
  /**
   * Handles an incoming request by routing to the appropriate handler
   *
   * @param request - The request to process
   * @param token - Optional cancellation token
   * @returns Promise resolving to the response
   */
  async HandleRequest(request, token) {
    const requestId = request.id;
    const startTime = performance.now();
    try {
      if (!request || !request.id || !request.method) {
        throw new Error("Invalid request: missing required fields");
      }
      if (this.activeRequestCount >= this.config.maxConcurrentRequests) {
        throw new Error(
          `Maximum concurrent requests (${this.config.maxConcurrentRequests}) reached`
        );
      }
      this.activeRequestCount++;
      const tokenSource = new CancellationTokenSource();
      this.pendingRequests.set(requestId, tokenSource);
      if (token?.isCancellationRequested) {
        throw new Error("Request was cancelled before execution");
      }
      const registration = this.handlers.get(request.method);
      if (!registration) {
        throw new Error(
          `No handler registered for method: ${request.method}`
        );
      }
      this.logger.debug(
        `Processing request for method: ${request.method}`,
        { requestId, type: request.type }
      );
      const timeout = this.config.defaultTimeout;
      const response = await this.ExecuteWithTimeout(
        registration.handler,
        request,
        tokenSource.token,
        timeout
      );
      if (this.config.enableMetrics) {
        this.UpdateStats(request.method, startTime, true);
      }
      return response;
    } catch (error) {
      if (this.config.enableMetrics) {
        this.UpdateStats(request.method, startTime, false);
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Request failed for method: ${request.method}`,
        err,
        { requestId }
      );
      return {
        id: requestId,
        success: false,
        error: err.message,
        timestamp: Date.now()
      };
    } finally {
      this.activeRequestCount--;
      this.pendingRequests.delete(requestId);
    }
  }
  /**
   * Cancels an ongoing operation by request ID
   *
   * @param requestId - The ID of the request to cancel
   * @returns Result indicating success or failure
   */
  CancelOperation(requestId) {
    try {
      if (!requestId) {
        return Result.Err(new Error("Request ID cannot be empty"));
      }
      const tokenSource = this.pendingRequests.get(requestId);
      if (!tokenSource) {
        return Result.Ok(false);
      }
      tokenSource.cancel();
      this.pendingRequests.delete(requestId);
      this.logger.info(`Operation cancelled successfully`, { requestId });
      return Result.Ok(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to cancel operation`, err, { requestId });
      return Result.Err(err);
    }
  }
  /**
   * Unregisters a handler for the specified method
   *
   * @param method - The method name to unregister
   * @returns Result indicating success or failure
   */
  UnregisterHandler(method) {
    try {
      if (!method) {
        return Result.Err(new Error("Method name cannot be empty"));
      }
      const existed = this.handlers.delete(method);
      this.handlerStats.delete(method);
      this.logger.info(`Handler unregistered for method: ${method}`, {
        existed
      });
      return Result.Ok(existed);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to unregister handler for method: ${method}`,
        err
      );
      return Result.Err(err);
    }
  }
  /**
   * Gets statistics for a specific handler
   *
   * @param method - The method name to get stats for
   * @returns Handler statistics or undefined
   */
  GetHandlerStats(method) {
    return this.handlerStats.get(method);
  }
  /**
   * Gets all registered handler methods
   *
   * @returns Array of method names
   */
  GetRegisteredMethods() {
    return Array.from(this.handlers.keys());
  }
  /**
   * Clears all registered handlers and pending requests
   */
  Dispose() {
    this.logger.info("Disposing IPCHandler");
    for (const tokenSource of this.pendingRequests.values()) {
      try {
        tokenSource.cancel();
      } catch (error) {
        this.logger.warn(
          "Failed to cancel pending request during disposal",
          error
        );
      }
    }
    this.handlers.clear();
    this.pendingRequests.clear();
    this.handlerStats.clear();
    this.activeRequestCount = 0;
  }
  /**
   * Executes a handler with timeout support
   */
  async ExecuteWithTimeout(handler, request, token, timeoutMs) {
    return Promise.race([
      handler(request, token),
      new Promise(
        (_, reject) => setTimeout(
          () => reject(
            new Error(`Request timeout after ${timeoutMs}ms`)
          ),
          timeoutMs
        )
      )
    ]);
  }
  /**
   * Updates handler statistics after execution
   */
  UpdateStats(method, startTime, success) {
    const stats = this.handlerStats.get(method);
    if (!stats) return;
    const latency = performance.now() - startTime;
    const totalCalls = stats.totalCalls + 1;
    stats.totalCalls = totalCalls;
    stats.successfulCalls += success ? 1 : 0;
    stats.failedCalls += success ? 0 : 1;
    stats.averageLatency = (stats.averageLatency * (totalCalls - 1) + latency) / totalCalls;
    stats.lastCalled = Date.now();
    this.handlerStats.set(method, stats);
  }
};
function CreateIPCHandler(logger, config) {
  return new IPCHandler(logger, config);
}
__name(CreateIPCHandler, "CreateIPCHandler");
export {
  CreateIPCHandler,
  IPCHandler,
  OperationType
};
//# sourceMappingURL=Handler.js.map
