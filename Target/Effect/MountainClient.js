var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IMountainClientService.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/MountainClientService.ts
import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { v4 as uuidv4 } from "uuid";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var require2 = createRequire(import.meta.url);
var CircuitBreakerState = /* @__PURE__ */ ((CircuitBreakerState2) => {
  CircuitBreakerState2["Closed"] = "CLOSED";
  CircuitBreakerState2["Open"] = "OPEN";
  CircuitBreakerState2["HalfOpen"] = "HALF_OPEN";
  return CircuitBreakerState2;
})(CircuitBreakerState || {});
var ConnectionState = /* @__PURE__ */ ((ConnectionState2) => {
  ConnectionState2["Disconnected"] = "DISCONNECTED";
  ConnectionState2["Connecting"] = "CONNECTING";
  ConnectionState2["Connected"] = "CONNECTED";
  ConnectionState2["Degraded"] = "DEGRADED";
  ConnectionState2["Failed"] = "FAILED";
  return ConnectionState2;
})(ConnectionState || {});
var MountainClientService = class {
  static {
    __name(this, "MountainClientService");
  }
  _serviceBrand;
  // Core gRPC client and connection state
  client = null;
  channel = null;
  mountainHost = "localhost";
  mountainPort = 50051;
  // Default Mountain gRPC port
  connectionState = "DISCONNECTED" /* Disconnected */;
  connectionStartTime = 0;
  errorCount = 0;
  requestCounter = 0;
  activeRequests = /* @__PURE__ */ new Map();
  // Circuit breaker configuration with enhanced tracking
  circuitBreakerState = "CLOSED" /* Closed */;
  circuitBreakerFailureCount = 0;
  circuitBreakerSuccessCount = 0;
  circuitBreakerThreshold = 5;
  // Consecutive failures before opening
  circuitBreakerSuccessThreshold = 3;
  // Consecutive successes to close
  circuitBreakerTimeout = 6e4;
  // 60 seconds recovery timeout
  circuitBreakerOpenTime = 0;
  circuitBreakerHalfOpenAttempts = 0;
  // Retry configuration with exponential backoff and jitter
  maxRetries = 3;
  baseRetryDelay = 1e3;
  // Base delay in milliseconds
  maxRetryDelay = 1e4;
  // Maximum delay in milliseconds
  retryJitterFactor = 0.2;
  // 20% jitter
  // Health monitoring with comprehensive tracking
  healthCheckInterval = null;
  healthCheckPeriod = 3e4;
  // 30 seconds
  lastHealthCheck = 0;
  consecutiveSuccessfulHealthChecks = 0;
  healthCheckFailures = 0;
  lastHealthCheckError = null;
  // Performance metrics
  totalRequests = 0;
  totalFailures = 0;
  totalSuccesses = 0;
  averageResponseTime = 0;
  maxResponseTime = 0;
  minResponseTime = Infinity;
  // Connection metadata
  clientVersion = "1.0.0";
  clientId = uuidv4();
  sessionId = uuidv4();
  constructor() {
    this._serviceBrand = void 0;
    console.log(
      `[MountainClientService] Initializing Mountain gRPC client (ID: ${this.clientId})`
    );
    this.parseEnvironment();
    console.log(
      `[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}, Session: ${this.sessionId}`
    );
    this.registerShutdownHandlers();
  }
  /**
   * Parse environment variables with comprehensive configuration validation
   */
  parseEnvironment() {
    const mountainHost = process.env.MOUNTAIN_CONNECTION_HOST || "localhost";
    const mountainPort = process.env.MOUNTAIN_GRPC_PORT || "50051";
    const connectionTimeout = process.env.MOUNTAIN_CONNECTION_TIMEOUT || "30000";
    const maxRetries = process.env.MOUNTAIN_MAX_RETRIES || "3";
    const enableTLS = process.env.MOUNTAIN_ENABLE_TLS || "false";
    const healthCheckPeriod = process.env.MOUNTAIN_HEALTH_CHECK_PERIOD || "30000";
    this.mountainHost = mountainHost;
    this.mountainPort = parseInt(mountainPort, 10);
    if (maxRetries) {
      this.maxRetries = parseInt(maxRetries, 10);
    }
    if (healthCheckPeriod) {
      this.healthCheckPeriod = parseInt(healthCheckPeriod, 10);
    }
    console.log(
      `[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}, MAX_RETRIES=${this.maxRetries}`
    );
    if (!this.isValidHost(this.mountainHost)) {
      throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
    }
    if (this.mountainPort < 1 || this.mountainPort > 65535) {
      throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
    }
    if (this.maxRetries < 0 || this.maxRetries > 10) {
      console.warn(
        `[MountainClientService] Invalid max retries: ${this.maxRetries}, using default: 3`
      );
      this.maxRetries = 3;
    }
    if (this.healthCheckPeriod < 5e3 || this.healthCheckPeriod > 12e4) {
      console.warn(
        `[MountainClientService] Invalid health check period: ${this.healthCheckPeriod}ms, using default: 30000ms`
      );
      this.healthCheckPeriod = 3e4;
    }
  }
  /**
   * Validate host configuration with comprehensive pattern matching
   */
  isValidHost(host) {
    if (!host || host.trim().length === 0) {
      return false;
    }
    const validHostPatterns = [
      /^localhost$/,
      // localhost
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      // IPv4
      /^\[[0-9a-fA-F:]+\]$/,
      // IPv6 (bracketed)
      /^[0-9a-fA-F:]+$/,
      // IPv6 (unbracketed)
      /^[a-zA-Z0-9.-]+$/,
      // Domain name
      /^[a-zA-Z0-9_-]+$/,
      // Simple hostname
      /^unix:[\/\\].+$/
      // Unix domain socket
    ];
    return validHostPatterns.some((pattern) => pattern.test(host));
  }
  /**
   * Register graceful shutdown handlers for VS Code extension compatibility
   */
  registerShutdownHandlers() {
    process.on("SIGTERM", () => {
      console.log(
        "[MountainClientService] Received SIGTERM, shutting down gracefully"
      );
      this.disconnect().catch((error) => {
        console.error(
          "[MountainClientService] Graceful shutdown failed:",
          error
        );
      });
    });
    process.on("SIGINT", () => {
      console.log(
        "[MountainClientService] Received SIGINT, shutting down gracefully"
      );
      this.disconnect().catch((error) => {
        console.error(
          "[MountainClientService] Graceful shutdown failed:",
          error
        );
      });
    });
    if (typeof process !== "undefined" && process.env && process.env.VSCODE_PID) {
      console.log(
        "[MountainClientService] Running in VS Code extension context"
      );
    }
  }
  /**
   * Connect to Mountain gRPC server with comprehensive circuit breaker protection
   * and proper gRPC channel management
   */
  async connect() {
    this.CheckCircuitBreaker();
    if (this.connectionState === "CONNECTED" /* Connected */ || this.connectionState === "CONNECTING" /* Connecting */) {
      console.warn(
        `[MountainClientService] Already ${this.connectionState.toLowerCase()} to Mountain`
      );
      return;
    }
    console.log(
      `[MountainClientService] Connecting to Mountain at ${this.mountainHost}:${this.mountainPort} (Session: ${this.sessionId})`
    );
    this.connectionState = "CONNECTING" /* Connecting */;
    try {
      const packageDefinition = await this.loadProtocolDefinition();
      const protoDescriptor = grpc.loadPackageDefinition(
        packageDefinition
      );
      const target = `${this.mountainHost}:${this.mountainPort}`;
      const channelOptions = {
        "grpc.max_receive_message_length": 1024 * 1024 * 100,
        // 100MB max message size
        "grpc.max_send_message_length": 1024 * 1024 * 100,
        // 100MB max message size
        "grpc.keepalive_time_ms": 1e4,
        // 10s keepalive ping
        "grpc.keepalive_timeout_ms": 5e3,
        // 5s keepalive timeout
        "grpc.keepalive_permit_without_calls": 1,
        // Allow keepalive without calls
        "grpc.http2.max_pings_without_data": 0,
        // No pings without data
        "grpc.http2.min_time_between_pings_ms": 1e4,
        // 10s min between pings
        "grpc.http2.min_ping_interval_without_data_ms": 3e4,
        // 30s min ping interval
        "grpc.enable_retries": 1,
        // Enable gRPC built-in retries
        "grpc.max_retry_attempts": 3,
        // Max retry attempts
        "grpc.initial_reconnect_backoff_ms": 1e3,
        // Initial reconnect backoff
        "grpc.max_reconnect_backoff_ms": 3e4,
        // Max reconnect backoff
        "grpc.enable_channelz": 0
        // Disable channelz for perf
      };
      this.client = new (protoDescriptor.Vine?.MountainService || protoDescriptor.MountainService)(
        target,
        grpc.credentials.createInsecure(),
        channelOptions
      );
      await this.waitForConnection();
      this.connectionState = "CONNECTED" /* Connected */;
      this.connectionStartTime = Date.now();
      this.errorCount = 0;
      this.consecutiveSuccessfulHealthChecks = 0;
      this.healthCheckFailures = 0;
      this.startHealthMonitoring();
      console.log(
        `[MountainClientService] Successfully connected to Mountain (Session: ${this.sessionId})`
      );
      this.UpdateCircuitBreaker(true);
    } catch (error) {
      this.connectionState = "FAILED" /* Failed */;
      this.errorCount++;
      this.circuitBreakerFailureCount++;
      console.error(
        `[MountainClientService] Failed to connect to Mountain:`,
        error
      );
      this.UpdateCircuitBreaker(false, error);
      throw new Error(
        `Failed to connect to Mountain: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Load protocol definition with comprehensive error handling and fallback strategies
   */
  async loadProtocolDefinition() {
    console.log(
      "[MountainClientService] Loading Vine.proto protocol definition"
    );
    try {
      const fs = require2("fs");
      const path = require2("path");
      const SearchPaths = [
        path.resolve(
          __dirname,
          "../../../../Mountain/Proto/Vine.proto"
        ),
        path.resolve(
          process.cwd(),
          "Element/Mountain/Proto/Vine.proto"
        ),
        path.resolve(process.cwd(), "../Mountain/Proto/Vine.proto")
      ];
      let vineProtoPath = null;
      for (const P of SearchPaths) {
        if (fs.existsSync(P)) {
          vineProtoPath = P;
          break;
        }
      }
      if (vineProtoPath) {
        console.log(
          `[MountainClientService] Found Vine.proto at: ${vineProtoPath}`
        );
        return protoLoader.loadSync(vineProtoPath, {
          keepCase: true,
          // Preserve field names
          longs: String,
          // Use String for uint64 compatibility
          enums: String,
          // Use String for enum compatibility
          defaults: true,
          // Include default values
          oneofs: true,
          // Support oneof fields
          includeDirs: [path.dirname(vineProtoPath)],
          // Include proto directory
          arrays: true,
          // Support repeated fields
          objects: true,
          // Support message objects
          bytes: Buffer
          // Use Buffer for bytes fields
        });
      } else {
        console.warn(
          "[MountainClientService] Vine.proto not found at:",
          vineProtoPath
        );
        const fallbackProtoContent = `syntax = "proto3";

package Vine;

service MountainService {
    rpc ProcessCocoonRequest(GenericRequest) returns (GenericResponse);
    rpc SendCocoonNotification(GenericNotification) returns (Empty);
    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

service CocoonService {
    rpc ProcessMountainRequest(GenericRequest) returns (GenericResponse);
    rpc SendMountainNotification(GenericNotification) returns (Empty);
    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

message GenericRequest {
    uint64 RequestIdentifier = 1;
    string Method = 2;
    bytes Parameter = 3;
}

message GenericResponse {
    uint64 RequestIdentifier = 1;
    bytes Result = 2;
    optional RPCError error = 3;
}

message GenericNotification {
    string Method = 1;
    bytes Parameter = 2;
}

message RPCError {
    int32 Code = 1;
    string Message = 2;
    bytes Data = 3;
}

message CancelOperationRequest {
    uint64 RequestIdentifierToCancel = 1;
}

message Empty {}

message RPCDataPayload {
    bytes Data = 1;
}`;
        const tempDir = require2("os").tmpdir();
        const tempProtoPath = path.join(tempDir, "vine_fallback.proto");
        fs.writeFileSync(tempProtoPath, fallbackProtoContent);
        console.log(
          `[MountainClientService] Using fallback protocol at: ${tempProtoPath}`
        );
        return protoLoader.loadSync(tempProtoPath, {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          arrays: true,
          objects: true,
          bytes: Buffer
        });
      }
    } catch (error) {
      console.error(
        "[MountainClientService] Failed to load protocol definition:",
        error
      );
      throw new Error(
        `Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Wait for connection with comprehensive timeout and readiness checking
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error("Client not initialized"));
        return;
      }
      const startTime = Date.now();
      const timeout = 3e3;
      const checkConnection = /* @__PURE__ */ __name(() => {
        const channel = this.client.getChannel();
        if (channel) {
          const state = channel.getConnectivityState(true);
          if (state === grpc.connectivityState.READY) {
            console.log(
              "[MountainClientService] Connection established and ready"
            );
            resolve();
            return;
          } else if (state === grpc.connectivityState.TRANSIENT_FAILURE || state === grpc.connectivityState.SHUTDOWN) {
            reject(
              new Error(
                `Connection failed with state: ${grpc.connectivityState[state]}`
              )
            );
            return;
          }
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error("Connection timeout exceeded"));
          return;
        }
        setTimeout(checkConnection, 100);
      }, "checkConnection");
      setTimeout(checkConnection, 100);
    });
  }
  /**
   * Send request to Mountain with comprehensive circuit breaker, retry logic,
   * cancellation support, and VS Code extension compatibility
   */
  async sendRequest(method, parameters, cancellationToken) {
    this.CheckCircuitBreaker();
    if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
      throw new Error("Not connected to Mountain");
    }
    const requestIdentifier = this.generateRequestId();
    const startTime = Date.now();
    this.activeRequests.set(BigInt(requestIdentifier), {
      method,
      startTime
    });
    console.log(
      `[MountainClientService] Sending request to Mountain: ${method}, ID: ${requestIdentifier}`
    );
    try {
      if (cancellationToken?.isCancellationRequested) {
        throw new Error("Request cancelled before execution");
      }
      const request = {
        RequestIdentifier: BigInt(requestIdentifier),
        Method: method,
        Parameter: this.SerializeParameters(parameters)
      };
      if (method === "tree.register" && typeof process !== "undefined") {
        try {
          const Timestamp = process.hrtime.bigint().toString();
          const Correlation = parameters?.[0]?.viewId ?? `req-${requestIdentifier}`;
          process.stdout.write(
            `[LandFix:Tree] wire-send method=${method} correlation=${Correlation} t=${Timestamp}
`
          );
        } catch {
        }
      }
      const response = await this.SendRequestWithRetry(
        request,
        cancellationToken
      );
      const duration = Date.now() - startTime;
      if (response.error) {
        const rpcError = response.error;
        const RpcMessage = String(rpcError.Message ?? "");
        const IsBenignNotFound = (method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory") && /resource not found|ENOENT|not found/i.test(RpcMessage);
        if (!IsBenignNotFound) {
          this.circuitBreakerFailureCount++;
          this.UpdateCircuitBreaker(
            false,
            new Error(
              `RPC Error: ${rpcError.Message} (Code: ${rpcError.Code})`
            )
          );
        }
        const error = new Error(
          `Mountain request failed: ${rpcError.Message}`
        );
        error.code = rpcError.Code;
        error.data = rpcError.Data ? this.DeserializeResponse(rpcError.Data) : void 0;
        throw error;
      }
      const responseData = this.DeserializeResponse(response.Result);
      console.log(
        `[MountainClientService] Request ${method} completed successfully in ${duration}ms`
      );
      this.trackRequestMetrics(method, duration, true);
      this.UpdateCircuitBreaker(true);
      return responseData;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.errorCount++;
      const ErrorMessage = error instanceof Error ? error.message : String(error);
      const IsBenignNotFound = (method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory") && /resource not found|ENOENT|not found/i.test(ErrorMessage);
      if (IsBenignNotFound) {
        process.stdout.write(
          `[LandFix:MountainClient] ${method} 404 after ${duration}ms (benign) - ${ErrorMessage}
`
        );
      } else {
        this.circuitBreakerFailureCount++;
        this.UpdateCircuitBreaker(false, error);
        console.error(
          `[MountainClientService] Request ${method} failed after ${duration}ms:`,
          error
        );
      }
      if (cancellationToken?.isCancellationRequested) {
        console.log(
          `[MountainClientService] Request ${requestIdentifier} was cancelled`
        );
        throw new Error(`Request ${requestIdentifier} was cancelled`);
      }
      if (this.isConnectionError(error)) {
        console.log(
          "[MountainClientService] Connection error detected, attempting auto-reconnect"
        );
        try {
          await this.reconnect();
          console.log(
            "[MountainClientService] Auto-reconnect successful, retrying request"
          );
          return this.sendRequest(
            method,
            parameters,
            cancellationToken
          );
        } catch (reconnectError) {
          console.error(
            "[MountainClientService] Auto-reconnect failed:",
            reconnectError
          );
        }
      }
      throw error;
    } finally {
      this.activeRequests.delete(BigInt(requestIdentifier));
    }
  }
  /**
   * Track comprehensive request performance metrics for observability
   */
  trackRequestMetrics(method, duration, success) {
    this.totalRequests++;
    if (success) {
      this.totalSuccesses++;
    } else {
      this.totalFailures++;
    }
    this.averageResponseTime = (this.averageResponseTime * (this.totalRequests - 1) + duration) / this.totalRequests;
    this.maxResponseTime = Math.max(this.maxResponseTime, duration);
    this.minResponseTime = Math.min(this.minResponseTime, duration);
    console.log(
      `[MountainClientService] Request metrics: ${method}, ${duration}ms, success: ${success}`
    );
  }
  /**
   * Check if error is a connection error with comprehensive pattern matching
   */
  isConnectionError(error) {
    if (!error) return false;
    const connectionErrorPatterns = [
      // gRPC error codes
      error.code === "UNAVAILABLE",
      error.code === "DEADLINE_EXCEEDED",
      error.code === "CANCELLED",
      error.code === "UNKNOWN",
      // Numeric gRPC error codes
      error.code === 14,
      // UNAVAILABLE
      error.code === 4,
      // DEADLINE_EXCEEDED
      error.code === 1,
      // CANCELLED
      error.code === 2,
      // UNKNOWN
      // Error message patterns
      error.message?.includes("connect"),
      error.message?.includes("connection"),
      error.message?.includes("socket"),
      error.message?.includes("network"),
      error.message?.includes("ECONN"),
      error.message?.includes("ENOTFOUND"),
      error.message?.includes("ETIMEDOUT"),
      error.message?.includes("refused"),
      error.message?.includes("timeout"),
      error.message?.includes("channel"),
      // Node.js error codes
      error.code === "ECONNREFUSED",
      error.code === "ECONNRESET",
      error.code === "ETIMEDOUT",
      error.code === "ENOTFOUND"
    ];
    return connectionErrorPatterns.some((pattern) => pattern === true);
  }
  /**
   * Send request with exponential backoff retry logic
   */
  async SendRequestWithRetry(request) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    let lastError = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await new Promise(
          (resolve, reject) => {
            this.client.ProcessCocoonRequest(
              request,
              (error, response2) => {
                if (error) reject(error);
                else resolve(response2);
              }
            );
          }
        );
        return response;
      } catch (error) {
        lastError = error;
        if (!this.isTransientError(error)) {
          throw error;
        }
        if (attempt < this.maxRetries - 1) {
          const delay = this.CalculateRetryDelay(attempt);
          console.warn(
            `[MountainClientService] Request ${request.RequestIdentifier} failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms:`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError || new Error("Max retry attempts exceeded");
  }
  /**
   * Calculate retry delay with exponential backoff
   */
  CalculateRetryDelay(attempt) {
    const exponentialDelay = this.baseRetryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, this.maxRetryDelay);
  }
  /**
   * Check if error is transient and should be retried
   */
  isTransientError(error) {
    const transientCodes = [
      "UNAVAILABLE",
      "DEADLINE_EXCEEDED",
      "INTERNAL",
      "RESOURCE_EXHAUSTED"
    ];
    return error && (transientCodes.includes(error.code) || error.code === 14 || // UNAVAILABLE
    error.code === 4 || // DEADLINE_EXCEEDED
    this.isConnectionError(error));
  }
  /**
   * Serialize parameters to buffer with validation
   */
  SerializeParameters(parameters) {
    try {
      if (parameters === null || parameters === void 0) {
        return Buffer.from(JSON.stringify({}));
      }
      const serialized = JSON.stringify(parameters);
      return Buffer.from(serialized, "utf8");
    } catch (error) {
      console.error(
        "[MountainClientService] Failed to serialize parameters:",
        error
      );
      throw new Error(
        `Parameter serialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Deserialize response buffer with error handling
   */
  DeserializeResponse(buffer) {
    try {
      if (!buffer || buffer.length === 0) {
        return {};
      }
      const serialized = buffer.toString("utf8");
      return JSON.parse(serialized);
    } catch (error) {
      console.error(
        "[MountainClientService] Failed to deserialize response:",
        error
      );
      return {};
    }
  }
  /**
   * Update circuit breaker state based on operation result
   */
  UpdateCircuitBreaker(success) {
    if (success) {
      this.circuitBreakerFailureCount = 0;
      if (this.circuitBreakerState === "HALF_OPEN" /* HalfOpen */) {
        console.log(
          "[MountainClientService] Circuit breaker transitioning to CLOSED (service recovered)"
        );
        this.circuitBreakerState = "CLOSED" /* Closed */;
      }
    } else {
      this.circuitBreakerFailureCount++;
      if (this.circuitBreakerFailureCount >= this.circuitBreakerThreshold) {
        this.circuitBreakerState = "OPEN" /* Open */;
        this.circuitBreakerOpenTime = Date.now();
        console.log(
          `[MountainClientService] Circuit breaker OPENED after ${this.circuitBreakerFailureCount} failures`
        );
      }
    }
  }
  /**
   * Check circuit breaker state and throw if open
   */
  CheckCircuitBreaker() {
    if (this.circuitBreakerState === "OPEN" /* Open */) {
      if (Date.now() - this.circuitBreakerOpenTime >= this.circuitBreakerTimeout) {
        this.circuitBreakerState = "HALF_OPEN" /* HalfOpen */;
        console.log(
          "[MountainClientService] Circuit breaker transitioning to HALF_OPEN for recovery"
        );
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Service unavailable. Time remaining until half-open: ${Math.round((this.circuitBreakerTimeout - (Date.now() - this.circuitBreakerOpenTime)) / 1e3)}s`
        );
      }
    }
  }
  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      return;
    }
    this.lastHealthCheck = Date.now();
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckPeriod);
    console.log(
      `[MountainClientService] Health monitoring started (interval: ${this.healthCheckPeriod}ms)`
    );
  }
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("[MountainClientService] Health monitoring stopped");
    }
  }
  /**
   * Perform health check
   */
  async performHealthCheck() {
    this.lastHealthCheck = Date.now();
    try {
      const channel = this.client?.getChannel?.();
      if (channel) {
        const state = channel.getConnectivityState(false);
        if (state !== 2) {
          throw new Error(`Channel not ready (state: ${state})`);
        }
      }
      this.consecutiveSuccessfulHealthChecks++;
      console.log(
        `[MountainClientService] Health check passed (consecutive successes: ${this.consecutiveSuccessfulHealthChecks})`
      );
      if (this.consecutiveSuccessfulHealthChecks >= 3 && this.circuitBreakerState === "HALF_OPEN" /* HalfOpen */) {
        this.UpdateCircuitBreaker(true);
      }
    } catch (error) {
      this.consecutiveSuccessfulHealthChecks = 0;
      this.errorCount++;
      this.circuitBreakerFailureCount++;
      this.UpdateCircuitBreaker(false);
      console.error(
        "[MountainClientService] Health check failed:",
        error
      );
      if (!this.isConnected) {
        console.log(
          "[MountainClientService] Connection lost, attempting reconnect"
        );
        this.reconnect().catch((err) => {
          console.error(
            "[MountainClientService] Auto-reconnect failed:",
            err
          );
        });
      }
    }
  }
  /**
   * Send notification to Mountain
   */
  async sendNotification(method, parameters) {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to Mountain");
    }
    console.log(
      `[MountainClientService] Sending notification to Mountain: ${method}`
    );
    try {
      const notification = {
        Method: method,
        Parameter: Buffer.from(JSON.stringify(parameters))
      };
      await this.makeNotification(notification);
      console.log(
        `[MountainClientService] Notification ${method} sent successfully`
      );
    } catch (error) {
      this.errorCount++;
      console.error(
        `[MountainClientService] Notification ${method} failed:`,
        error
      );
      console.warn(
        `[MountainClientService] Notification ${method} failed, but continuing (fire-and-forget)`
      );
    }
  }
  /**
   * Make gRPC notification with promise interface
   */
  async makeNotification(notification) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    try {
      await new Promise((resolve, reject) => {
        this.client.SendCocoonNotification(
          notification,
          (error) => {
            if (error) reject(error);
            else resolve();
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }
  /**
   * Cancel operation
   */
  async cancelOperation(requestIdentifier, reason) {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to Mountain");
    }
    console.log(
      `[MountainClientService] Canceling operation: ${requestIdentifier}, reason: ${reason}`
    );
    try {
      const cancelRequest = {
        RequestIdentifierToCancel: BigInt(requestIdentifier)
        // Use BigInt for uint64 compatibility
      };
      await this.makeCancelRequest(cancelRequest);
      console.log(
        `[MountainClientService] Operation ${requestIdentifier} canceled`
      );
    } catch (error) {
      this.errorCount++;
      console.error(
        `[MountainClientService] Cancel operation ${requestIdentifier} failed:`,
        error
      );
      console.warn(
        `[MountainClientService] Cancel operation ${requestIdentifier} failed, but continuing`
      );
    }
  }
  /**
   * Make gRPC cancel request with promise interface
   */
  async makeCancelRequest(cancelRequest) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    try {
      await new Promise((resolve, reject) => {
        this.client.CancelOperation(cancelRequest, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      throw error;
    }
  }
  /**
   * Generate unique request identifier
   */
  generateRequestId() {
    return ++this.requestCounter;
  }
  /**
   * Disconnect from Mountain
   */
  async disconnect() {
    if (!this.isConnected || !this.client) {
      console.warn("[MountainClientService] Not connected to Mountain");
      return;
    }
    console.log("[MountainClientService] Disconnecting from Mountain");
    this.stopHealthMonitoring();
    this.client = null;
    this.isConnected = false;
    console.log("[MountainClientService] Disconnected from Mountain");
  }
  /**
   * Reconnect to Mountain
   */
  async reconnect() {
    console.log("[MountainClientService] Reconnecting to Mountain");
    await this.disconnect();
    await this.connect();
    console.log("[MountainClientService] Reconnected to Mountain");
  }
  /**
   * Get connection status with circuit breaker information
   */
  getStatus() {
    return {
      connected: this.isConnected,
      mountainHost: this.mountainHost,
      mountainPort: this.mountainPort,
      errorCount: this.errorCount,
      ...this.isConnected ? { uptime: Date.now() - this.connectionStartTime } : {},
      circuitBreakerState: this.circuitBreakerState,
      circuitBreakerFailureCount: this.circuitBreakerFailureCount,
      ...this.lastHealthCheck ? { lastHealthCheck: new Date(this.lastHealthCheck) } : {}
    };
  }
};
var MountainClientServiceLayer = IMountainClientService.Default;

// Source/Effect/Telemetry.ts
import {
  Context,
  Effect as Effect3,
  HashMap,
  Layer as Layer2,
  Option,
  Ref,
  Stream,
  SubscriptionRef
} from "effect";
var TelemetryCollectionError = class extends Error {
  constructor(operation, cause) {
    super(
      `Telemetry collection failed for '${operation}': ${String(cause)}`
    );
    this.operation = operation;
    this.cause = cause;
  }
  operation;
  cause;
  static {
    __name(this, "TelemetryCollectionError");
  }
  _tag = "TelemetryCollectionError";
};
var TelemetryTag = class extends Context.Tag("Cocoon/Telemetry")() {
  static {
    __name(this, "TelemetryTag");
  }
};
var Telemetry = TelemetryTag;
var TelemetryLive = Layer2.effect(
  Telemetry,
  Effect3.gen(function* () {
    const metricsRef = yield* SubscriptionRef.make(HashMap.empty());
    const spansRef = yield* SubscriptionRef.make(HashMap.empty());
    const eventsRef = yield* SubscriptionRef.make([]);
    const recordMetric = /* @__PURE__ */ __name((name, value, labels) => Effect3.gen(function* () {
      const metric = {
        name,
        value,
        timestamp: Date.now(),
        labels
      };
      const events = yield* eventsRef.get;
      yield* Ref.set(eventsRef, [
        ...events,
        {
          type: "metric",
          timestamp: metric.timestamp,
          data: metric
        }
      ]);
      const currentMetrics = yield* metricsRef.get;
      const nameMetrics = HashMap.get(currentMetrics, name).pipe(
        Option.getOrElse(() => [])
      );
      yield* Ref.set(
        metricsRef,
        HashMap.set(currentMetrics, name, [...nameMetrics, metric])
      );
    }), "recordMetric");
    const startSpan = /* @__PURE__ */ __name((name, labels) => Effect3.gen(function* () {
      const startTime = Date.now();
      const span = {
        name,
        startTime,
        success: false,
        labels: labels ?? {}
      };
      const events = yield* eventsRef.get;
      yield* Ref.set(eventsRef, [
        ...events,
        { type: "span", timestamp: startTime, data: span }
      ]);
      return {
        end: /* @__PURE__ */ __name((success, error) => Effect3.gen(function* () {
          const endTime = Date.now();
          const completedSpan = {
            ...span,
            endTime,
            duration: endTime - startTime,
            success,
            error
          };
          const events2 = yield* eventsRef.get;
          yield* Ref.set(eventsRef, [
            ...events2,
            {
              type: "span",
              timestamp: endTime,
              data: completedSpan
            }
          ]);
          const currentSpans = yield* spansRef.get;
          const nameSpans = HashMap.get(
            currentSpans,
            name
          ).pipe(Option.getOrElse(() => []));
          yield* Ref.set(
            spansRef,
            HashMap.set(currentSpans, name, [
              ...nameSpans,
              completedSpan
            ])
          );
        }), "end")
      };
    }), "startSpan");
    const log = /* @__PURE__ */ __name((level, message, context) => Effect3.gen(function* () {
      const logEntry = {
        level,
        message,
        context
      };
      const timestamp = Date.now();
      const events = yield* eventsRef.get;
      yield* Ref.set(eventsRef, [
        ...events,
        { type: "log", timestamp, data: logEntry }
      ]);
      const Prefix = `[Cocoon Telemetry] [${level.toUpperCase()}]`;
      let ContextText = "";
      if (context && Object.keys(context).length > 0) {
        try {
          ContextText = ` ${JSON.stringify(context)}`;
        } catch {
          ContextText = " [unserializable-context]";
        }
      }
      const Line = `${Prefix} ${message}${ContextText}
`;
      const Stream2 = level === "error" ? process.stderr : process.stdout;
      try {
        Stream2.write(Line);
      } catch {
      }
    }), "log");
    const getMetrics = /* @__PURE__ */ __name((name) => Effect3.gen(function* () {
      const metrics = yield* metricsRef.get;
      return HashMap.get(metrics, name).pipe(
        Option.getOrElse(() => [])
      );
    }), "getMetrics");
    const getAverageDuration = /* @__PURE__ */ __name((name) => Effect3.gen(function* () {
      const spans = yield* spansRef.get;
      const nameSpans = HashMap.get(spans, name).pipe(
        Option.getOrElse(() => [])
      );
      if (nameSpans.length === 0) {
        return 0;
      }
      const totalDuration = nameSpans.reduce(
        (sum, span) => {
          return sum + (span.duration ?? 0);
        },
        0
      );
      return totalDuration / nameSpans.length;
    }), "getAverageDuration");
    const getSuccessRate = /* @__PURE__ */ __name((name) => Effect3.gen(function* () {
      const spans = yield* spansRef.get;
      const nameSpans = HashMap.get(spans, name).pipe(
        Option.getOrElse(() => [])
      );
      if (nameSpans.length === 0) {
        return 1;
      }
      const successCount = nameSpans.filter(
        (span) => span.success
      ).length;
      return successCount / nameSpans.length;
    }), "getSuccessRate");
    const flush = Effect3.gen(function* () {
      yield* Ref.set(metricsRef, HashMap.empty());
      yield* Ref.set(spansRef, HashMap.empty());
      yield* Ref.set(eventsRef, []);
    });
    return {
      recordMetric,
      startSpan,
      log,
      events: eventsRef.changes,
      getMetrics,
      getAverageDuration,
      getSuccessRate,
      flush
    };
  })
);
var makeMockTelemetry = /* @__PURE__ */ __name(() => ({
  recordMetric: /* @__PURE__ */ __name(() => Effect3.void, "recordMetric"),
  startSpan: /* @__PURE__ */ __name(() => Effect3.succeed({
    end: /* @__PURE__ */ __name(() => Effect3.void, "end")
  }), "startSpan"),
  log: /* @__PURE__ */ __name((level, message, context) => Effect3.sync(() => {
    const Prefix = `[Cocoon Telemetry Mock] [${level.toUpperCase()}]`;
    let ContextText = "";
    if (context && Object.keys(context).length > 0) {
      try {
        ContextText = ` ${JSON.stringify(context)}`;
      } catch {
        ContextText = " [unserializable-context]";
      }
    }
    const Stream2 = level === "error" ? process.stderr : process.stdout;
    try {
      Stream2.write(`${Prefix} ${message}${ContextText}
`);
    } catch {
    }
  }), "log"),
  events: Stream.empty,
  getMetrics: /* @__PURE__ */ __name(() => Effect3.succeed([]), "getMetrics"),
  getAverageDuration: /* @__PURE__ */ __name(() => Effect3.succeed(0), "getAverageDuration"),
  getSuccessRate: /* @__PURE__ */ __name(() => Effect3.succeed(1), "getSuccessRate"),
  flush: Effect3.void
}), "makeMockTelemetry");
var TelemetryMock = Layer2.effect(
  Telemetry,
  Effect3.succeed(makeMockTelemetry())
);
var withSpan = /* @__PURE__ */ __name((name, effect, labels) => Effect3.gen(function* () {
  const telemetry = yield* Telemetry;
  const span = yield* telemetry.startSpan(name, labels);
  const result = yield* effect.pipe(
    Effect3.catchAll(
      (error) => Effect3.gen(function* () {
        yield* span.end(false, String(error));
        return yield* Effect3.fail(error);
      })
    )
  );
  yield* span.end(true);
  return result;
}), "withSpan");

// Source/Effect/MountainClient.ts
import { Context as Context2, Effect as Effect4, Layer as Layer3, Ref as Ref2, SubscriptionRef as SubscriptionRef2 } from "effect";
var ConnectionError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.message = message;
    this.cause = cause;
  }
  message;
  cause;
  static {
    __name(this, "ConnectionError");
  }
  _tag = "ConnectionError";
};
var RPCError2 = class extends Error {
  constructor(method, message, cause) {
    super(message);
    this.method = method;
    this.message = message;
    this.cause = cause;
  }
  method;
  message;
  cause;
  static {
    __name(this, "RPCError");
  }
  _tag = "RPCError";
  method;
};
var DisconnectionError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.message = message;
    this.cause = cause;
  }
  message;
  cause;
  static {
    __name(this, "DisconnectionError");
  }
  _tag = "DisconnectionError";
};
var MountainClientTag = class extends Context2.Tag("Cocoon/MountainClient")() {
  static {
    __name(this, "MountainClientTag");
  }
};
var MountainClient = MountainClientTag;
var MountainClientLive = Layer3.effect(
  MountainClient,
  Effect4.gen(function* () {
    const telemetry = yield* TelemetryTag;
    const stateRef = yield* SubscriptionRef2.make({
      _tag: "Disconnected"
    });
    let realClient;
    let currentConfig;
    let metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      lastRequestTime: 0
    };
    const latencies = [];
    let serverVersion = "";
    const connect = /* @__PURE__ */ __name((config) => Effect4.gen(function* () {
      const currentState = yield* stateRef.get;
      if (currentState._tag === "Connected") {
        telemetry.log(
          "warn",
          "[MountainClient] Already connected to Mountain"
        );
        return;
      }
      currentConfig = config ?? {
        host: "localhost",
        port: 50052,
        timeout: 5e3,
        maxRetries: 3,
        retryDelay: 1e3,
        enableCompression: true,
        enableMetrics: true
      };
      telemetry.log(
        "info",
        `[MountainClient] Connecting to Mountain at ${currentConfig.host}:${currentConfig.port}...`
      );
      yield* Ref2.set(stateRef, {
        _tag: "Connecting",
        attempt: 1
      });
      try {
        realClient = new MountainClientService();
        realClient.mountainHost = currentConfig.host;
        realClient.mountainPort = currentConfig.port;
        yield* Effect4.promise(() => realClient.connect());
        serverVersion = "1.0.0";
      } catch (error) {
        yield* Ref2.set(stateRef, {
          _tag: "Error",
          error: String(error)
        });
        telemetry.log(
          "error",
          `[MountainClient] Failed to connect to Mountain: ${String(error)}`
        );
        return yield* Effect4.fail(
          new ConnectionError(
            "Failed to connect to Mountain backend",
            error
          )
        );
      }
      yield* Ref2.set(stateRef, {
        _tag: "Connected",
        serverVersion,
        connectedAt: Date.now()
      });
      telemetry.log(
        "info",
        `[MountainClient] Connected to Mountain (v${serverVersion})`
      );
    }), "connect");
    const disconnect = Effect4.gen(function* () {
      const currentState = yield* stateRef.get;
      if (currentState._tag !== "Connected") {
        telemetry.log(
          "warn",
          "[MountainClient] Not connected to Mountain"
        );
        return;
      }
      yield* Ref2.set(stateRef, {
        _tag: "Disconnecting"
      });
      telemetry.log(
        "info",
        "[MountainClient] Disconnecting from Mountain..."
      );
      if (realClient) {
        yield* Effect4.promise(() => realClient.disconnect());
        realClient = void 0;
      }
      yield* Ref2.set(stateRef, {
        _tag: "Disconnected"
      });
      metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        lastRequestTime: 0
      };
      latencies.length = 0;
      telemetry.log(
        "info",
        "[MountainClient] Disconnected from Mountain"
      );
    }).pipe(
      Effect4.catchAll(
        (error) => Effect4.gen(function* () {
          yield* Ref2.set(stateRef, {
            _tag: "Error",
            error: String(error)
          });
          telemetry.log(
            "error",
            `[MountainClient] Failed to disconnect: ${String(error)}`
          );
          return yield* Effect4.fail(
            new DisconnectionError("Failed to disconnect", error)
          );
        })
      )
    );
    const rpc = /* @__PURE__ */ __name((method) => (params) => Effect4.gen(function* () {
      const requestStartTime = Date.now();
      const currentState = yield* stateRef.get;
      if (currentState._tag !== "Connected") {
        metrics.failedRequests++;
        return yield* Effect4.fail(
          new RPCError2(method, "Not connected to Mountain")
        );
      }
      telemetry.log(
        "debug",
        `[MountainClient] RPC call: ${method}`,
        params
      );
      metrics.totalRequests++;
      try {
        if (!realClient) {
          return yield* Effect4.fail(
            new RPCError2(
              method,
              "Not connected to Mountain"
            )
          );
        }
        const Result = yield* Effect4.promise(
          () => realClient.sendRequest(method, params)
        );
        const processingTime = Date.now() - requestStartTime;
        latencies.push(processingTime);
        if (latencies.length > 100) latencies.shift();
        metrics.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
        metrics.lastRequestTime = Date.now();
        metrics.successfulRequests++;
        telemetry.log(
          "debug",
          `[MountainClient] RPC success: ${method} (${processingTime}ms)`
        );
        return Result;
      } catch (error) {
        metrics.failedRequests++;
        telemetry.log(
          "error",
          `[MountainClient] RPC failed: ${method} (${String(error)})`
        );
        return yield* Effect4.fail(
          new RPCError2(
            method,
            `RPC call failed: ${String(error)}`,
            error
          )
        );
      }
    }), "rpc");
    const version = Effect4.gen(function* () {
      const currentState = yield* stateRef.get;
      if (currentState._tag !== "Connected") {
        return yield* Effect4.fail(
          new ConnectionError("Not connected to Mountain")
        );
      }
      return currentState.serverVersion;
    });
    const HealthCheckTimeoutMs = 1e3;
    const healthCheck = Effect4.gen(function* () {
      const currentState = yield* stateRef.get;
      if (currentState._tag !== "Connected") return false;
      if (!realClient) return false;
      const Outcome = yield* Effect4.promise(
        () => Promise.race([
          realClient.sendRequest("FileSystem.Stat", ["/"]).then(() => ({ Kind: "ok" })).catch((Err) => ({
            Kind: "app-error",
            Message: Err instanceof Error ? Err.message : String(Err)
          })),
          new Promise(
            (Resolve) => setTimeout(
              () => Resolve({ Kind: "timeout" }),
              HealthCheckTimeoutMs
            )
          )
        ])
      );
      if (Outcome.Kind === "timeout") {
        yield* Ref2.set(stateRef, {
          _tag: "Error",
          error: `Health check timed out after ${HealthCheckTimeoutMs}ms`
        });
        telemetry.log(
          "warn",
          `[MountainClient] Health check timed out; marking connection as Error state for auto-reconnect`
        );
        return false;
      }
      if (Outcome.Kind === "app-error") {
        const LooksLikeTransport = /UNAVAILABLE|transport|disconnect|ECONNREFUSED|ECONNRESET|NOT_FOUND service/i.test(
          Outcome.Message
        );
        if (LooksLikeTransport) {
          yield* Ref2.set(stateRef, {
            _tag: "Error",
            error: Outcome.Message
          });
          telemetry.log(
            "warn",
            `[MountainClient] Health check hit transport failure (${Outcome.Message}); marking Error state`
          );
          return false;
        }
      }
      return true;
    });
    const getMetrics = Effect4.succeed({ ...metrics });
    return {
      connectionState: stateRef.get,
      connectionChanges: Effect4.map(stateRef.get, (state) => [state]),
      connect,
      disconnect,
      rpc,
      version,
      healthCheck,
      getMetrics
    };
  })
);
var makeMockMountainClient = /* @__PURE__ */ __name(() => {
  const mockState = {
    _tag: "Connected",
    serverVersion: "1.0.0",
    connectedAt: Date.now()
  };
  return {
    connectionState: Effect4.succeed(mockState),
    connectionChanges: Effect4.succeed([mockState]),
    connect: /* @__PURE__ */ __name(() => Effect4.succeed(void 0), "connect"),
    disconnect: /* @__PURE__ */ __name(() => Effect4.succeed(void 0), "disconnect"),
    rpc: /* @__PURE__ */ __name((method) => (params) => Effect4.succeed({
      success: true,
      data: { method, params, mock: true }
    }), "rpc"),
    version: Effect4.succeed("1.0.0"),
    healthCheck: Effect4.succeed(true),
    getMetrics: Effect4.succeed({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      lastRequestTime: 0
    })
  };
}, "makeMockMountainClient");
var MountainClientMock = Layer3.effect(
  MountainClient,
  Effect4.succeed(makeMockMountainClient())
);
export {
  ConnectionError,
  DisconnectionError,
  MountainClient,
  MountainClientLive,
  MountainClientMock,
  MountainClientTag,
  RPCError2 as RPCError,
  makeMockMountainClient
};
//# sourceMappingURL=MountainClient.js.map
