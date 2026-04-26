/**
 * @file Platform Service - Effect-TS Layer for Platform Abstraction
 * @description
 * Main platform service that integrates OS, Environment, Process, and TypeConverter
 * modules into a comprehensive Effect-TS layer. Provides dependency injection,
 * service lifecycle management, and effect-based operations for all platform
 * functionality.
 *
 * **Responsibilities:**
 * - Initialize and manage platform service lifecycle
 * - Provide Effect-TS layer for dependency injection
 * - Orchestrate OS, Environment, Process operations
 * - Cache platform information for performance
 * - Handle service errors and recovery
 * - Monitor platform health and metrics
 * - Bridge to Mountain backend via TypeConverter
 *
 * **Element Connections:**
 * - **Air**: Rust workbench may call platform operations via service layer
 * - **Wind**: Effect-TS services depend on PlatformService for OS operations
 * - **Mountain**: Service converts platform data to Mountain DTOs via TypeConverter
 * - **Output**: References VSCode service layer patterns
 *
 * **TODOs:**
 * DEPENDENCY: Wind Effect context registration - integrate with Wind layer
 * FUTURE: Health checks - add /health endpoint with platform status
 * FUTURE: Observability - integrate with OpenTelemetry for tracing
 * FUTURE: Hot-reload - use fs.watch to detect platform info changes
 * DEPENDENCY: Wind PlatformServiceTag - create in Wind services
 * DEPENDENCY: Wind PlatformService init - call in Wind main()
 * DEPENDENCY: Mountain GRPC endpoints - pending Mountain backend
 * TESTING: Integration tests - add vitest integration test suite
 * PERFORMANCE: Adaptive cache - track access patterns for cache size
 * DOCUMENTATION: API docs - generate with TypeDoc
 */

import { Context, Effect, Layer, Option } from "effect";

import * as EnvironmentModule from "./Environment.js";
import * as OSModule from "./OS.js";
import * as ProcessModule from "./Process.js";
import * as TypeConverterModule from "./TypeConverter.js";

/**
 * Platform Service interface
 */
export interface IPlatformService {
	readonly _serviceBrand: undefined;

	// Initialization
	initialize(): Effect.Effect<void, Error>;

	// OS operations
	detectPlatform(): Effect.Effect<OSModule.PlatformNumber, Error>;
	getOSInfo(): Effect.Effect<OSModule.OSInfo, Error>;
	isWindows(): Effect.Effect<boolean>;
	isMacintosh(): Effect.Effect<boolean>;
	isLinux(): Effect.Effect<boolean>;
	normalizePath(path: string): Effect.Effect<string, Error>;
	joinPath(...segments: string[]): Effect.Effect<string>;

	// Environment operations
	getEnvironmentVariable(name: string): Effect.Effect<Option.Option<string>>;
	setEnvironmentVariable(
		name: string,
		value: string,
	): Effect.Effect<void, Error>;
	getEnvironmentInfo(): Effect.Effect<
		EnvironmentModule.EnvironmentInfo,
		Error
	>;
	getLanguage(): Effect.Effect<string>;
	getLocale(): Effect.Effect<string>;
	getHomeDirectory(): Effect.Effect<string>;
	getTempDirectory(): Effect.Effect<string>;

	// Process operations
	spawnProcess(
		command: string,
		args: string[],
		options: ProcessModule.ProcessSpawnOptions,
	): Effect.Effect<ProcessModule.ProcessInfo | null, Error>;

	executeCommand(
		command: string,
		args: string[],
		options?: ProcessModule.ProcessSpawnOptions,
	): Effect.Effect<
		{ stdout: string; stderr: string; exitCode: number | null },
		Error
	>;

	killProcess(pid: number): Effect.Effect<boolean>;
	getProcess(
		pid: number,
	): Effect.Effect<Option.Option<ProcessModule.ProcessInfo>>;

	// Type conversion operations
	convertOSInfoToDTO(
		osInfo: OSModule.OSInfo,
	): Effect.Effect<TypeConverterModule.MountainPlatformInfoDTO>;
	convertEnvironmentInfoToDTO(
		envInfo: EnvironmentModule.EnvironmentInfo,
	): Effect.Effect<TypeConverterModule.MountainEnvironmentInfoDTO>;
	convertProcessInfoToDTO(
		procInfo: ProcessModule.ProcessInfo,
	): Effect.Effect<TypeConverterModule.MountainProcessInfoDTO>;

	// Health and monitoring
	getHealthStatus(): Effect.Effect<{
		status: "healthy" | "degraded" | "unhealthy";
		uptime: number;
		lastUpdate: number;
	}>;

	// Cleanup
	dispose(): Effect.Effect<void>;
}

/**
 * Platform Service implementation
 */
export class PlatformService implements IPlatformService {
	readonly _serviceBrand: undefined;

	private startTime: number = 0;
	private initialized: boolean = false;
	private cache: Map<string, { value: any; timestamp: number }> = new Map();
	private readonly CACHE_TTL = 60000; // 60 seconds

	constructor() {
		this._serviceBrand = undefined;
	}

	/**
	 * Initialize platform service
	 */
	initialize(): Effect.Effect<void, Error> {
		return Effect.sync(() => {
			if (this.initialized) {
				console.log("[PlatformService] Already initialized");
				return;
			}

			this.startTime = Date.now();

			// Perform initial platform detection
			const platform = OSModule.GetPlatformNumber();
			const osInfo = OSModule.GetOSInfo();
			const envInfo = EnvironmentModule.GetEnvironmentInfo();

			// Cache initial values
			this.cache.set("platform", {
				value: platform,
				timestamp: Date.now(),
			});
			this.cache.set("osInfo", { value: osInfo, timestamp: Date.now() });
			this.cache.set("envInfo", {
				value: envInfo,
				timestamp: Date.now(),
			});

			this.initialized = true;

			console.log("[PlatformService] Initialized successfully", {
				platform,
				osInfo,
				envInfo,
			});
		});
	}

	/**
	 * Get cached value or compute new one
	 */
	private getCached<T>(key: string, compute: () => T): T {
		const cached = this.cache.get(key);
		const now = Date.now();

		if (cached && now - cached.timestamp < this.CACHE_TTL) {
			return cached.value as T;
		}

		const value = compute();
		this.cache.set(key, { value, timestamp: now });
		return value;
	}

	/**
	 * Clear cache
	 */
	private clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Detect platform
	 */
	detectPlatform(): Effect.Effect<OSModule.PlatformNumber, Error> {
		return Effect.sync(() => {
			return this.getCached("platform", () =>
				OSModule.GetPlatformNumber(),
			);
		});
	}

	/**
	 * Get OS information
	 */
	getOSInfo(): Effect.Effect<OSModule.OSInfo, Error> {
		return Effect.sync(() => {
			return this.getCached("osInfo", () => OSModule.GetOSInfo());
		});
	}

	/**
	 * Check if Windows
	 */
	isWindows(): Effect.Effect<boolean> {
		return Effect.sync(() => OSModule.IsWindows());
	}

	/**
	 * Check if Macintosh
	 */
	isMacintosh(): Effect.Effect<boolean> {
		return Effect.sync(() => OSModule.IsMacintosh());
	}

	/**
	 * Check if Linux
	 */
	isLinux(): Effect.Effect<boolean> {
		return Effect.sync(() => OSModule.IsLinux());
	}

	/**
	 * Normalize path for current platform
	 */
	normalizePath(path: string): Effect.Effect<string, Error> {
		return Effect.sync(() => OSModule.NormalizePath(path));
	}

	/**
	 * Join path segments
	 */
	joinPath(...segments: string[]): Effect.Effect<string> {
		return Effect.sync(() => OSModule.JoinPath(...segments));
	}

	/**
	 * Get environment variable
	 */
	getEnvironmentVariable(name: string): Effect.Effect<Option.Option<string>> {
		return Effect.sync(() =>
			EnvironmentModule.GetEnvironmentVariable(name),
		);
	}

	/**
	 * Set environment variable
	 */
	setEnvironmentVariable(
		name: string,
		value: string,
	): Effect.Effect<void, Error> {
		return Effect.sync(() => {
			if (!EnvironmentModule.SetEnvironmentVariable(name, value)) {
				throw new Error(`Failed to set environment variable: ${name}`);
			}

			// Invalidate environment cache
			this.cache.delete("envInfo");
		});
	}

	/**
	 * Get environment information
	 */
	getEnvironmentInfo(): Effect.Effect<
		EnvironmentModule.EnvironmentInfo,
		Error
	> {
		return Effect.sync(() => {
			return this.getCached("envInfo", () =>
				EnvironmentModule.GetEnvironmentInfo(),
			);
		});
	}

	/**
	 * Get language
	 */
	getLanguage(): Effect.Effect<string> {
		return Effect.sync(() => EnvironmentModule.GetLanguage());
	}

	/**
	 * Get locale
	 */
	getLocale(): Effect.Effect<string> {
		return Effect.sync(() => EnvironmentModule.GetLocale());
	}

	/**
	 * Get home directory
	 */
	getHomeDirectory(): Effect.Effect<string> {
		return Effect.sync(() => EnvironmentModule.GetHomeDirectory());
	}

	/**
	 * Get temp directory
	 */
	getTempDirectory(): Effect.Effect<string> {
		return Effect.sync(() => EnvironmentModule.GetTempDirectory());
	}

	/**
	 * Spawn process
	 */
	spawnProcess(
		command: string,
		args: string[],
		options: ProcessModule.ProcessSpawnOptions,
	): Effect.Effect<ProcessModule.ProcessInfo | null, Error> {
		return Effect.tryPromise({
			try: () => ProcessModule.SpawnProcess(command, args, options),
			catch: (error) => new Error(`Failed to spawn process: ${error}`),
		});
	}

	/**
	 * Execute command
	 */
	executeCommand(
		command: string,
		args: string[],
		options?: ProcessModule.ProcessSpawnOptions,
	): Effect.Effect<
		{ stdout: string; stderr: string; exitCode: number | null },
		Error
	> {
		return Effect.tryPromise({
			try: () =>
				ProcessModule.ExecuteCommand(command, args, options || {}),
			catch: (error) => new Error(`Failed to execute command: ${error}`),
		});
	}

	/**
	 * Kill process
	 */
	killProcess(pid: number): Effect.Effect<boolean> {
		return Effect.sync(() => ProcessModule.KillProcess(pid));
	}

	/**
	 * Get process info
	 */
	getProcess(
		pid: number,
	): Effect.Effect<Option.Option<ProcessModule.ProcessInfo>> {
		return Effect.sync(() => ProcessModule.GetProcess(pid));
	}

	/**
	 * Convert OS info to Mountain DTO
	 */
	convertOSInfoToDTO(
		osInfo: OSModule.OSInfo,
	): Effect.Effect<TypeConverterModule.MountainPlatformInfoDTO> {
		return Effect.sync(() =>
			TypeConverterModule.ConvertOSInfoToDTO(osInfo),
		);
	}

	/**
	 * Convert environment info to Mountain DTO
	 */
	convertEnvironmentInfoToDTO(
		envInfo: EnvironmentModule.EnvironmentInfo,
	): Effect.Effect<TypeConverterModule.MountainEnvironmentInfoDTO> {
		return Effect.sync(() =>
			TypeConverterModule.ConvertEnvironmentInfoToDTO(envInfo),
		);
	}

	/**
	 * Convert process info to Mountain DTO
	 */
	convertProcessInfoToDTO(
		procInfo: ProcessModule.ProcessInfo,
	): Effect.Effect<TypeConverterModule.MountainProcessInfoDTO> {
		return Effect.sync(() =>
			TypeConverterModule.ConvertProcessInfoToDTO(procInfo),
		);
	}

	/**
	 * Get health status
	 */
	getHealthStatus(): Effect.Effect<{
		status: "healthy" | "degraded" | "unhealthy";
		uptime: number;
		lastUpdate: number;
	}> {
		return Effect.sync(() => {
			const uptime = Date.now() - this.startTime;
			const lastUpdate = Math.max(
				this.getCacheTimestamp("osInfo"),
				this.getCacheTimestamp("envInfo"),
				this.getCacheTimestamp("platform"),
			);

			// Determine health status
			let status: "healthy" | "degraded" | "unhealthy" = "healthy";

			if (!this.initialized) {
				status = "unhealthy";
			} else if (Date.now() - lastUpdate > 120000) {
				status = "degraded"; // Stale cache
			}

			return {
				status,
				uptime,
				lastUpdate,
			};
		});
	}

	/**
	 * Get cache timestamp by key
	 */
	private getCacheTimestamp(key: string): number {
		const cached = this.cache.get(key);
		return cached ? cached.timestamp : 0;
	}

	/**
	 * Dispose platform service
	 */
	dispose(): Effect.Effect<void> {
		return Effect.sync(() => {
			console.log("[PlatformService] Disposing...");

			// Clean up all processes
			ProcessModule.CleanupAllProcesses();

			// Clear cache
			this.clearCache();

			console.log("[PlatformService] Disposed");
		});
	}
}

/**
 * Platform Service Tag for Effect-TS dependency injection
 */
export const PlatformServiceTag =
	Context.GenericTag<IPlatformService>("PlatformService");

/**
 * Platform Service Layer
 */
export const PlatformServiceLayer = Layer.sync(
	PlatformServiceTag,
	() => new PlatformService(),
);

/**
 * Live platform service layer
 */
export const LivePlatformService = PlatformServiceLayer;

/**
 * Test platform service layer (for testing)
 */
export const TestPlatformService = Layer.succeed(
	PlatformServiceTag,
	new PlatformService(),
);

/**
 * Convenience functions using PlatformService context
 */

/**
 * Get platform number from context
 */
export function DetectPlatform(): Effect.Effect<
	OSModule.PlatformNumber,
	never,
	IPlatformService
> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.detectPlatform(),
	);
}

/**
 * Get OS info from context
 */
export function GetOSInfo(): Effect.Effect<
	OSModule.OSInfo,
	never,
	IPlatformService
> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.getOSInfo(),
	);
}

/**
 * Normalize path using platform context
 */
export function NormalizePath(
	path: string,
): Effect.Effect<string, never, IPlatformService> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.normalizePath(path),
	);
}

/**
 * Get environment variable using platform context
 */
export function GetEnvironmentVariable(
	name: string,
): Effect.Effect<Option.Option<string>, never, IPlatformService> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.getEnvironmentVariable(name),
	);
}

/**
 * Set environment variable using platform context
 */
export function SetEnvironmentVariable(
	name: string,
	value: string,
): Effect.Effect<void, never, IPlatformService> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.setEnvironmentVariable(name, value),
	);
}

/**
 * Execute command using platform context
 */
export function ExecuteCommand(
	command: string,
	args?: string[],
	options?: ProcessModule.ProcessSpawnOptions,
): Effect.Effect<
	{ stdout: string; stderr: string; exitCode: number | null },
	never,
	IPlatformService
> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.executeCommand(command, args || [], options),
	);
}

/**
 * Spawn process using platform context
 */
export function SpawnProcess(
	command: string,
	args: string[],
	options: ProcessModule.ProcessSpawnOptions,
): Effect.Effect<ProcessModule.ProcessInfo | null, never, IPlatformService> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.spawnProcess(command, args, options),
	);
}

/**
 * Get service health status using platform context
 */
export function GetHealthStatus(): Effect.Effect<
	{
		status: "healthy" | "degraded" | "unhealthy";
		uptime: number;
		lastUpdate: number;
	},
	never,
	IPlatformService
> {
	return Effect.flatMap(Effect.service(PlatformServiceTag), (service: IPlatformService) =>
		service.getHealthStatus(),
	);
}

/**
 * Initialize platform service
 */
export function InitializePlatformService(): Effect.Effect<void, never> {
	return Effect.sync(() => {
		const service = new PlatformService();
		return Effect.runPromise(service.initialize());
	}).pipe(Effect.flatMap(() => Effect.void));
}

/**
 * Export Platform service module
 */
export const PlatformServiceModule = {
	IPlatformService,
	PlatformService,
	PlatformServiceTag,
	PlatformServiceLayer,
	LivePlatformService,
	TestPlatformService,
	DetectPlatform,
	GetOSInfo,
	NormalizePath,
	GetEnvironmentVariable,
	SetEnvironmentVariable,
	ExecuteCommand,
	SpawnProcess,
	GetHealthStatus,
	InitializePlatformService,
};

/**
 * Re-export submodules for convenience
 */
export { OSModule as OS };
export { EnvironmentModule as Environment };
export { ProcessModule as Process };
export { TypeConverterModule as TypeConverter };
