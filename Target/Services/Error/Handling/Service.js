var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Dev/Log.ts
var Raw = process.env["Trace"] ?? "";
var ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
var TagSet = new Set(ParsedTags);
var IsShort = TagSet.has("short");
var HasAll = TagSet.has("all");
var IsEnabled = /* @__PURE__ */ __name((Tag) => {
  if (TagSet.size === 0) return false;
  if (HasAll || IsShort) return true;
  return TagSet.has(Tag.toLowerCase());
}, "IsEnabled");
var CocoonDevLog = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog;

// Source/Services/Error/Handling/Service.ts
import { Effect, Layer } from "effect";
var ErrorHandlingService = class {
  static {
    __name(this, "ErrorHandlingService");
  }
  _serviceBrand;
  circuitBreakers = /* @__PURE__ */ new Map();
  config;
  constructor() {
    this._serviceBrand = void 0;
    this.config = this.loadDefaultConfig();
    CocoonDevLog(
      "service",
      "[ErrorHandlingService] Initializing error handling service"
    );
  }
  /**
   * Load default configuration
   */
  loadDefaultConfig() {
    return {
      maxRetries: 3,
      retryDelay: 1e3,
      // 1 second
      exponentialBackoff: true,
      circuitBreakerTimeout: 3e4,
      // 30 seconds
      circuitBreakerThreshold: 5
    };
  }
  /**
   * Execute operation with advanced error handling and metrics
   */
  async executeWithRetry(operation, operationName, customConfig) {
    const startTime = Date.now();
    const config = { ...this.config, ...customConfig };
    CocoonDevLog(
      "service",
      `[ErrorHandlingService] Executing operation: ${operationName}`
    );
    const circuitState = this.getCircuitBreakerState(operationName);
    if (circuitState.state === "OPEN") {
      const error = new Error(
        `Circuit breaker is OPEN for ${operationName} (failures: ${circuitState.failureCount})`
      );
      CocoonDevLog(
        "service",
        `[ErrorHandlingService] Circuit breaker blocked operation: ${operationName}`
      );
      this.trackCircuitBreakerEvent(operationName, "blocked");
      return {
        success: false,
        error,
        retries: 0,
        duration: Date.now() - startTime,
        circuitBreakerState: circuitState,
        metrics: {
          circuitBreakerBlocked: true,
          totalRetries: 0,
          executionTime: Date.now() - startTime
        }
      };
    }
    let lastError;
    let totalRetries = 0;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const operationStartTime = Date.now();
        const result = await operation();
        const operationDuration = Date.now() - operationStartTime;
        this.recordSuccess(operationName);
        this.trackOperationSuccess(
          operationName,
          operationDuration,
          attempt
        );
        CocoonDevLog(
          "service",
          `[ErrorHandlingService] Operation ${operationName} succeeded on attempt ${attempt + 1} in ${operationDuration}ms`
        );
        return {
          success: true,
          result,
          retries: attempt,
          duration: Date.now() - startTime,
          circuitBreakerState: this.getCircuitBreakerState(operationName),
          metrics: {
            totalRetries: attempt,
            executionTime: Date.now() - startTime,
            operationDuration,
            circuitBreakerBlocked: false
          }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        totalRetries = attempt;
        CocoonDevLog(
          "service",
          `[ErrorHandlingService] Operation ${operationName} failed on attempt ${attempt + 1}:`,
          error
        );
        this.recordFailure(operationName);
        this.trackOperationFailure(operationName, error, attempt);
        if (attempt < config.maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(attempt, config);
          CocoonDevLog(
            "service",
            `[ErrorHandlingService] Retrying ${operationName} in ${delay}ms`
          );
          await this.delay(delay);
        } else {
          break;
        }
      }
    }
    CocoonDevLog(
      "service",
      `[ErrorHandlingService] Operation ${operationName} failed after ${totalRetries} retries`
    );
    return {
      success: false,
      error: lastError,
      retries: totalRetries,
      duration: Date.now() - startTime,
      circuitBreakerState: this.getCircuitBreakerState(operationName),
      metrics: {
        totalRetries,
        executionTime: Date.now() - startTime,
        circuitBreakerBlocked: false,
        finalFailure: true
      }
    };
  }
  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        serviceName,
        state: "CLOSED",
        failureCount: 0,
        lastFailureTime: 0,
        successThreshold: 3,
        failureThreshold: this.config.circuitBreakerThreshold,
        timeout: this.config.circuitBreakerTimeout
      });
    }
    const state = this.circuitBreakers.get(serviceName);
    if (state.state === "OPEN" && Date.now() - state.lastFailureTime > state.timeout) {
      state.state = "HALF_OPEN";
      CocoonDevLog(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} transitioned to HALF_OPEN`
      );
    }
    return state;
  }
  /**
   * Record operation success
   */
  recordSuccess(serviceName) {
    const state = this.getCircuitBreakerState(serviceName);
    if (state.state === "HALF_OPEN") {
      state.state = "CLOSED";
      state.failureCount = 0;
      CocoonDevLog(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} closed after successful operation`
      );
    } else if (state.state === "CLOSED") {
      state.failureCount = Math.max(0, state.failureCount - 1);
    }
  }
  /**
   * Record operation failure
   */
  recordFailure(serviceName) {
    const state = this.getCircuitBreakerState(serviceName);
    state.failureCount++;
    state.lastFailureTime = Date.now();
    if (state.state === "HALF_OPEN") {
      state.state = "OPEN";
      CocoonDevLog(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} reopened after failure in HALF_OPEN state`
      );
    } else if (state.state === "CLOSED" && state.failureCount >= state.failureThreshold) {
      state.state = "OPEN";
      CocoonDevLog(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} opened after ${state.failureCount} failures`
      );
    }
  }
  /**
   * Calculate retry delay with jitter
   */
  calculateRetryDelay(attempt, config) {
    if (!config.exponentialBackoff) {
      return config.retryDelay;
    }
    const baseDelay = config.retryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay * 0.1;
    const finalDelay = baseDelay + (Math.random() > 0.5 ? jitter : -jitter);
    return Math.min(finalDelay, 3e4);
  }
  /**
   * Advanced error classification with ML-inspired patterns
   */
  shouldRetry(error) {
    const errorMessage = error.message.toLowerCase();
    const nonRetryablePatterns = [
      "invalidargument",
      "notfound",
      "alreadyexists",
      "permissiondenied",
      "unauthenticated",
      "unauthorized",
      "badrequest",
      "forbidden",
      "conflict",
      "gone"
    ];
    const retryablePatterns = [
      "timeout",
      "deadlineexceeded",
      "unavailable",
      "busy",
      "overloaded",
      "temporarilyunavailable",
      "network",
      "connection",
      "socket"
    ];
    if (nonRetryablePatterns.some(
      (pattern) => errorMessage.includes(pattern)
    )) {
      return false;
    }
    if (retryablePatterns.some((pattern) => errorMessage.includes(pattern))) {
      return true;
    }
    return this.isTransientError(error);
  }
  /**
   * Determine if error is transient
   */
  isTransientError(error) {
    const transientIndicators = [
      "temporary",
      "transient",
      "retry",
      "again",
      "later",
      "soon",
      "momentarily",
      "briefly"
    ];
    const errorMessage = error.message.toLowerCase();
    return transientIndicators.some(
      (indicator) => errorMessage.includes(indicator)
    );
  }
  /**
   * Track operation success with advanced analytics
   */
  trackOperationSuccess(operationName, duration, attempt) {
    const successMetrics = {
      operationName,
      duration,
      attempt,
      timestamp: Date.now(),
      success: true,
      retryCount: attempt,
      circuitBreakerState: this.getCircuitBreakerState(operationName).state
    };
    CocoonDevLog(
      "service",
      `[ErrorHandlingService] Success metrics: ${JSON.stringify(successMetrics)}`
    );
    this.adaptRetryStrategy(operationName, duration, attempt);
  }
  /**
   * Adapt retry strategy based on historical patterns
   */
  adaptRetryStrategy(operationName, duration, attempt) {
    const circuitState = this.getCircuitBreakerState(operationName);
    if (attempt === 0 && duration < 1e3) {
      circuitState.successThreshold = Math.max(
        1,
        circuitState.successThreshold - 1
      );
    }
  }
  /**
   * Track operation failure with advanced analytics
   */
  trackOperationFailure(operationName, error, attempt) {
    const failureMetrics = {
      operationName,
      attempt,
      timestamp: Date.now(),
      success: false,
      errorType: this.classifyError(error),
      errorMessage: error.message.substring(0, 200),
      // Truncate long messages
      retryable: this.shouldRetry(error),
      circuitBreakerState: this.getCircuitBreakerState(operationName).state
    };
    CocoonDevLog(
      "service",
      `[ErrorHandlingService] Failure metrics: ${JSON.stringify(failureMetrics)}`
    );
  }
  /**
   * Classify error for better analytics
   */
  classifyError(error) {
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes("timeout") || errorMessage.includes("deadline")) {
      return "timeout";
    } else if (errorMessage.includes("network") || errorMessage.includes("connection")) {
      return "network";
    } else if (errorMessage.includes("permission") || errorMessage.includes("unauthorized")) {
      return "permission";
    } else if (errorMessage.includes("invalid") || errorMessage.includes("bad request")) {
      return "validation";
    } else if (errorMessage.includes("not found") || errorMessage.includes("missing")) {
      return "not_found";
    } else {
      return "unknown";
    }
  }
  /**
   * Track circuit breaker events
   */
  trackCircuitBreakerEvent(operationName, eventType) {
    CocoonDevLog(
      "service",
      `[ErrorHandlingService] Circuit breaker event: ${operationName}, ${eventType}`
    );
  }
  /**
   * Delay execution
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(serviceName) {
    return this.circuitBreakers.get(serviceName);
  }
  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitBreakerStatuses() {
    return Array.from(this.circuitBreakers.values());
  }
  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(serviceName) {
    if (this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.delete(serviceName);
      CocoonDevLog(
        "service",
        `[ErrorHandlingService] Circuit breaker reset for ${serviceName}`
      );
    }
  }
  /**
   * Update configuration
   */
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    CocoonDevLog("service", "[ErrorHandlingService] Configuration updated");
  }
  /**
   * Get service statistics
   */
  getStatistics() {
    const states = this.getAllCircuitBreakerStatuses();
    return {
      totalCircuitBreakers: states.length,
      openCircuitBreakers: states.filter((s) => s.state === "OPEN").length,
      halfOpenCircuitBreakers: states.filter(
        (s) => s.state === "HALF_OPEN"
      ).length,
      closedCircuitBreakers: states.filter((s) => s.state === "CLOSED").length,
      config: this.config
    };
  }
};
var ErrorHandlingServiceLayer = Layer.effect(
  "ErrorHandlingService",
  Effect.sync(() => new ErrorHandlingService())
);
var ErrorHandlingServiceLive = Layer.effect(
  "ErrorHandlingService",
  Effect.sync(() => new ErrorHandlingService())
);
export {
  ErrorHandlingService,
  ErrorHandlingServiceLayer,
  ErrorHandlingServiceLive
};
//# sourceMappingURL=Service.js.map
