const n = {
	host: "localhost",

	port: 50051,

	connectionTimeout: 3e4,

	maxRetries: 3,

	retryDelay: 1e3,

	keepAlive: !0,

	keepAliveInterval: 1e4,

	maxMessageSize: 104857600,

	useTls: !1,

	debug: !1,

	autoReconnect: !0,

	autoReconnectDelay: 5e3,

	maxAutoReconnectAttempts: 5,
};

function r() {
	const e = { ...n };

	if (
		(process.env.MOUNTAIN_HOST && (e.host = process.env.MOUNTAIN_HOST),
		process.env.MOUNTAIN_PORT)
	) {
		const t = parseInt(process.env.MOUNTAIN_PORT, 10);

		!isNaN(t) && t > 0 && t <= 65535 && (e.port = t);
	}

	if (process.env.MOUNTAIN_CONNECTION_TIMEOUT) {
		const t = parseInt(process.env.MOUNTAIN_CONNECTION_TIMEOUT, 10);

		!isNaN(t) && t > 0 && (e.connectionTimeout = t);
	}

	if (process.env.MOUNTAIN_MAX_RETRIES) {
		const t = parseInt(process.env.MOUNTAIN_MAX_RETRIES, 10);

		!isNaN(t) && t > 0 && (e.maxRetries = t);
	}

	if (process.env.MOUNTAIN_RETRY_DELAY) {
		const t = parseInt(process.env.MOUNTAIN_RETRY_DELAY, 10);

		!isNaN(t) && t > 0 && (e.retryDelay = t);
	}

	if (
		(process.env.MOUNTAIN_KEEP_ALIVE &&
			(e.keepAlive =
				process.env.MOUNTAIN_KEEP_ALIVE.toLowerCase() === "true"),
		process.env.MOUNTAIN_KEEP_ALIVE_INTERVAL)
	) {
		const t = parseInt(process.env.MOUNTAIN_KEEP_ALIVE_INTERVAL, 10);

		!isNaN(t) && t > 0 && (e.keepAliveInterval = t);
	}

	if (process.env.MOUNTAIN_MAX_MESSAGE_SIZE) {
		const t = parseInt(process.env.MOUNTAIN_MAX_MESSAGE_SIZE, 10);

		!isNaN(t) && t > 0 && (e.maxMessageSize = t);
	}

	if (
		(process.env.MOUNTAIN_USE_TLS &&
			(e.useTls = process.env.MOUNTAIN_USE_TLS.toLowerCase() === "true"),
		process.env.MOUNTAIN_TLS_CERT_PATH &&
			(e.tlsCertPath = process.env.MOUNTAIN_TLS_CERT_PATH),
		process.env.MOUNTAIN_DEBUG &&
			(e.debug = process.env.MOUNTAIN_DEBUG.toLowerCase() === "true"),
		process.env.MOUNTAIN_AUTO_RECONNECT &&
			(e.autoReconnect =
				process.env.MOUNTAIN_AUTO_RECONNECT.toLowerCase() === "true"),
		process.env.MOUNTAIN_AUTO_RECONNECT_DELAY)
	) {
		const t = parseInt(process.env.MOUNTAIN_AUTO_RECONNECT_DELAY, 10);

		!isNaN(t) && t > 0 && (e.autoReconnectDelay = t);
	}

	if (process.env.MOUNTAIN_MAX_AUTO_RECONNECT_ATTEMPTS) {
		const t = parseInt(
			process.env.MOUNTAIN_MAX_AUTO_RECONNECT_ATTEMPTS,

			10,
		);

		!isNaN(t) && t > 0 && (e.maxAutoReconnectAttempts = t);
	}

	return e;
}

function o(e) {
	const t = [];

	return (
		(!e.host || typeof e.host != "string") &&
			t.push("Host must be a non-empty string"),
		(!e.port || e.port < 1 || e.port > 65535) &&
			t.push("Port must be between 1 and 65535"),
		e.connectionTimeout <= 0 &&
			t.push("Connection timeout must be positive"),
		e.retryDelay <= 0 && t.push("Retry delay must be positive"),
		e.keepAliveInterval <= 0 &&
			t.push("Keep-alive interval must be positive"),
		e.maxMessageSize <= 0 && t.push("Max message size must be positive"),
		e.autoReconnectDelay <= 0 &&
			t.push("Auto-reconnect delay must be positive"),
		e.maxAutoReconnectAttempts <= 0 &&
			t.push("Max auto-reconnect attempts must be positive"),
		e.useTls &&
			!e.tlsCertPath &&
			t.push("TLS certificate path is required when TLS is enabled"),
		t
	);
}

function a(e) {
	const t = { ...n, ...e },
		s = o(t);

	if (s.length > 0)
		throw new Error(`Invalid Mountain configuration: ${s.join(", ")}`);

	return t;
}

function i(e) {
	return `Mountain Configuration:
  Host: ${e.host}

  Port: ${e.port}

  Connection Timeout: ${e.connectionTimeout}ms
  Max Retries: ${e.maxRetries}

  Retry Delay: ${e.retryDelay}ms
  Keep Alive: ${e.keepAlive}

  Keep Alive Interval: ${e.keepAliveInterval}ms
  Max Message Size: ${e.maxMessageSize} bytes
  Use TLS: ${e.useTls}

  TLS Cert Path: ${e.tlsCertPath || "Not specified"}

  Debug: ${e.debug}

  Auto Reconnect: ${e.autoReconnect}

  Auto Reconnect Delay: ${e.autoReconnectDelay}ms
  Max Auto Reconnect Attempts: ${e.maxAutoReconnectAttempts}`;
}

export {
	a as createMountainConfig,
	n as defaultMountainConfig,
	i as getMountainConfigSummary,
	r as loadMountainConfigFromEnv,
	o as validateMountainConfig,
};
