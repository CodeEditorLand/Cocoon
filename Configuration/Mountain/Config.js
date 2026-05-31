var __defProp = Object.defineProperty;

var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

const defaultMountainConfig = {

  host: "localhost",

  port: 50051,

  connectionTimeout: 3e4,

  maxRetries: 3,

  retryDelay: 1e3,

  keepAlive: true,

  keepAliveInterval: 1e4,

  maxMessageSize: 104857600,

  // 100MB
  useTls: false,

  debug: false,

  autoReconnect: true,

  autoReconnectDelay: 5e3,

  maxAutoReconnectAttempts: 5
};

function loadMountainConfigFromEnv() {

  const config = { ...defaultMountainConfig };

  if (process.env.MOUNTAIN_HOST) {
    config.host = process.env.MOUNTAIN_HOST;
  }

  if (process.env.MOUNTAIN_PORT) {
    const port = parseInt(process.env.MOUNTAIN_PORT, 10);

    if (!isNaN(port) && port > 0 && port <= 65535) {
      config.port = port;
    }
  }

  if (process.env.MOUNTAIN_CONNECTION_TIMEOUT) {
    const timeout = parseInt(process.env.MOUNTAIN_CONNECTION_TIMEOUT, 10);

    if (!isNaN(timeout) && timeout > 0) {
      config.connectionTimeout = timeout;
    }
  }

  if (process.env.MOUNTAIN_MAX_RETRIES) {
    const retries = parseInt(process.env.MOUNTAIN_MAX_RETRIES, 10);

    if (!isNaN(retries) && retries > 0) {
      config.maxRetries = retries;
    }
  }

  if (process.env.MOUNTAIN_RETRY_DELAY) {
    const delay = parseInt(process.env.MOUNTAIN_RETRY_DELAY, 10);

    if (!isNaN(delay) && delay > 0) {
      config.retryDelay = delay;
    }
  }

  if (process.env.MOUNTAIN_KEEP_ALIVE) {
    config.keepAlive = process.env.MOUNTAIN_KEEP_ALIVE.toLowerCase() === "true";
  }

  if (process.env.MOUNTAIN_KEEP_ALIVE_INTERVAL) {
    const interval = parseInt(process.env.MOUNTAIN_KEEP_ALIVE_INTERVAL, 10);

    if (!isNaN(interval) && interval > 0) {
      config.keepAliveInterval = interval;
    }
  }

  if (process.env.MOUNTAIN_MAX_MESSAGE_SIZE) {
    const size = parseInt(process.env.MOUNTAIN_MAX_MESSAGE_SIZE, 10);

    if (!isNaN(size) && size > 0) {
      config.maxMessageSize = size;
    }
  }

  if (process.env.MOUNTAIN_USE_TLS) {
    config.useTls = process.env.MOUNTAIN_USE_TLS.toLowerCase() === "true";
  }

  if (process.env.MOUNTAIN_TLS_CERT_PATH) {
    config.tlsCertPath = process.env.MOUNTAIN_TLS_CERT_PATH;
  }

  if (process.env.MOUNTAIN_DEBUG) {
    config.debug = process.env.MOUNTAIN_DEBUG.toLowerCase() === "true";
  }

  if (process.env.MOUNTAIN_AUTO_RECONNECT) {
    config.autoReconnect = process.env.MOUNTAIN_AUTO_RECONNECT.toLowerCase() === "true";
  }

  if (process.env.MOUNTAIN_AUTO_RECONNECT_DELAY) {
    const delay = parseInt(process.env.MOUNTAIN_AUTO_RECONNECT_DELAY, 10);

    if (!isNaN(delay) && delay > 0) {
      config.autoReconnectDelay = delay;
    }
  }

  if (process.env.MOUNTAIN_MAX_AUTO_RECONNECT_ATTEMPTS) {
    const attempts = parseInt(
      process.env.MOUNTAIN_MAX_AUTO_RECONNECT_ATTEMPTS,

      10
    );

    if (!isNaN(attempts) && attempts > 0) {
      config.maxAutoReconnectAttempts = attempts;
    }
  }

  return config;
}

__name(loadMountainConfigFromEnv, "loadMountainConfigFromEnv");

function validateMountainConfig(config) {

  const errors = [];

  if (!config.host || typeof config.host !== "string") {
    errors.push("Host must be a non-empty string");
  }

  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push("Port must be between 1 and 65535");
  }

  if (config.connectionTimeout <= 0) {
    errors.push("Connection timeout must be positive");
  }

  if (config.retryDelay <= 0) {
    errors.push("Retry delay must be positive");
  }

  if (config.keepAliveInterval <= 0) {
    errors.push("Keep-alive interval must be positive");
  }

  if (config.maxMessageSize <= 0) {
    errors.push("Max message size must be positive");
  }

  if (config.autoReconnectDelay <= 0) {
    errors.push("Auto-reconnect delay must be positive");
  }

  if (config.maxAutoReconnectAttempts <= 0) {
    errors.push("Max auto-reconnect attempts must be positive");
  }

  if (config.useTls && !config.tlsCertPath) {
    errors.push("TLS certificate path is required when TLS is enabled");
  }

  return errors;
}

__name(validateMountainConfig, "validateMountainConfig");

function createMountainConfig(overrides) {

  const config = { ...defaultMountainConfig, ...overrides };

  const errors = validateMountainConfig(config);

  if (errors.length > 0) {
    throw new Error(`Invalid Mountain configuration: ${errors.join(", ")}`);
  }

  return config;
}

__name(createMountainConfig, "createMountainConfig");

function getMountainConfigSummary(config) {

  return `Mountain Configuration:
  Host: ${config.host}

  Port: ${config.port}

  Connection Timeout: ${config.connectionTimeout}ms
  Max Retries: ${config.maxRetries}

  Retry Delay: ${config.retryDelay}ms
  Keep Alive: ${config.keepAlive}

  Keep Alive Interval: ${config.keepAliveInterval}ms
  Max Message Size: ${config.maxMessageSize} bytes
  Use TLS: ${config.useTls}

  TLS Cert Path: ${config.tlsCertPath || "Not specified"}

  Debug: ${config.debug}

  Auto Reconnect: ${config.autoReconnect}

  Auto Reconnect Delay: ${config.autoReconnectDelay}ms
  Max Auto Reconnect Attempts: ${config.maxAutoReconnectAttempts}`;
}

__name(getMountainConfigSummary, "getMountainConfigSummary");

export {
  createMountainConfig,
  defaultMountainConfig,
  getMountainConfigSummary,
  loadMountainConfigFromEnv,
  validateMountainConfig
};

//# sourceMappingURL=Config.js.map
