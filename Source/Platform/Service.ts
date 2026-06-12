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
 * DEPENDENCY: Mountain gRPC endpoints - pending Mountain backend
 * TESTING: Integration tests - add vitest integration test suite
 * PERFORMANCE: Adaptive cache - track access patterns for cache size
 * DOCUMENTATION: API docs - generate with TypeDoc
 */

import * as EnvironmentModule from "./Environment.js";

import * as OSModule from "./OS.js";

import * as ProcessModule from "./Process.js";

import * as TypeConverterModule from "./Type/Converter.js";

/**
 * Platform Service interface
 */
export interface IPlatformService {

	readonly _serviceBrand: undefined;

	// Initialization
	initialize(): Promise<void>;

	// OS operations
	detectPlatform(): Promise<OSModule.PlatformNumber>;

	getOSInfo(): Promise<OSModule.OSInfo>;

	isWindows(): Promise<boolean>;

	isMacintosh(): Promise<boolean>;

	isLinux(): Promise<boolean>;

	normalizePath(path: string): Promise<string>;

	joinPath(...segments: string[]): Promise<string>;

	// Environment operations
	getEnvironmentVariable(name: string): Promise<Option.Option<string>>;

	setEnvironmentVariable(
		name: string,

		value: string,
	): Promise<void>;

	getEnvironmentInfo(): Promise<
		EnvironmentModule.EnvironmentInfo,

		Error
	>;

	getLanguage(): Promise<string>;

	getLocale(): Promise<string>;

	getHomeDirectory(): Promise<string>;

	getTempDirectory(): Promise<string>;

	// Process operations
	spawnProcess(
		command: string,

		args: string[],

		options: ProcessModule.ProcessSpawnOptions,
	): Promise<ProcessModule.ProcessInfo | null>;

	executeCommand(
		command: string,

		args: string[],

		options?: ProcessModule.ProcessSpawnOptions,
	): Promise<
		{ stdout: string; stderr: string; exitCode: number | null },

		Error
	>;

	killProcess(pid: number): Promise<boolean>;

	getProcess(
		pid: number,
	): Promise<Option.Option<ProcessModule.ProcessInfo>>;

	// Type conversion operations
	convertOSInfoToDTO(
		osInfo: OSModule.OSInfo,
	): Promise<TypeConverterModule.MountainPlatformInfoDTO>;

	convertEnvironmentInfoToDTO(
		envInfo: EnvironmentModule.EnvironmentInfo,
	): Promise<TypeConverterModule.MountainEnvironmentInfoDTO>;

	convertProcessInfoToDTO(
		procInfo: ProcessModule.ProcessInfo,
	): Promise<TypeConverterModule.MountainProcessInfoDTO>;

	// Health and monitoring
	getHealthStatus(): Promise<{
		status: "healthy" | "degraded" | "unhealthy";

		uptime: number;

		lastUpdate: number;
	}>;

	// Cleanup
	dispose(): Promise<void>;
}

/**
 * Platform Service implementation
 */
export class PlatformService implements IPlatformService {

	readonly _serviceBrand: undefined;

	private startTime: number = 0;

	private initialized: boolean = false;

	private cache: Map<string, { value: any; timestamp: number }> = new Map(;

	private readonly CACHE_TTL = 60000; // 60 seconds

	constructor() {
		this._serviceBrand = undefined;
	}

	/**
	 * Initialize platform service
	 */
	initialize(): Promise<void> {
		return {
			if (this.initialized {
				console.log("[PlatformService] Already initialized";

				return;
			}

			this.startTime = Date.now(;

			// Perform initial platform detection
			const platform = OSModule.GetPlatformNumber(;

			const osInfo = OSModule.GetOSInfo(;

			const envInfo = EnvironmentModule.GetEnvironmentInfo(;

			// Cache initial values
			this.cache.set("platform", {
				value: platform,
				timestamp: Date.now(),
			};

			this.cache.set("osInfo", { value: osInfo, timestamp: Date.now() };

			this.cache.set("envInfo", {
				value: envInfo,
				timestamp: Date.now(),
			};

			this.initialized = true;

			console.log("[PlatformService] Initialized successfully", {
				platform,
				osInfo,
				envInfo,
			};
		};
	}

	/**
	 * Get cached value or compute new one
	 */
	private getCached<T>(key: string, compute: () => T): T {
		const cached = this.cache.get(key;

		const now = Date.now(;

		if (cached && now - cached.timestamp < this.CACHE_TTL) {
			return cached.value as T;
		}

		const value = compute(;

		this.cache.set(key, { value, timestamp: now };

		return value;
	}

	/**
	 * Clear cache
	 */
	private clearCache(): void {
		this.cache.clear(;
	}

	/**
	 * Detect platform
	 */
	detectPlatform(): Promise<OSModule.PlatformNumber> {
		return {
			return this.getCached("platform", ( =>
				OSModule.GetPlatformNumber(),
			;
		};
	}

	/**
	 * Get OS information
	 */
	getOSInfo(): Promise<OSModule.OSInfo> {
		return {
			return this.getCached("osInfo", ( => OSModule.GetOSInfo();
		};
	}

	/**
	 * Check if Windows
	 */
	isWindows(): Promise<boolean> {
		return OSModule.IsWindows(;
	}

	/**
	 * Check if Macintosh
	 */
	isMacintosh(): Promise<boolean> {
		return OSModule.IsMacintosh(;
	}

	/**
	 * Check if Linux
	 */
	isLinux(): Promise<boolean> {
		return OSModule.IsLinux(;
	}

	/**
	 * Normalize path for current platform
	 */
	normalizePath(path: string): Promise<string> {
		return OSModule.NormalizePath(path;
	}

	/**
	 * Join path segments
	 */
	joinPath(...segments: string[]): Promise<string> {
		return OSModule.JoinPath(...segments;
	}

	/**
	 * Get environment variable
	 */
	getEnvironmentVariable(name: string): Promise<Option.Option<string>> {
		return EnvironmentModule.GetEnvironmentVariable(name,
		;
	}

	/**
	 * Set environment variable
	 */
	setEnvironmentVariable(
		name: string,

		value: string,
	): Promise<void> {
		return {
			if (!EnvironmentModule.SetEnvironmentVariable(name, value) {
				throw new Error(`Failed to set environment variable: ${name}`;
			}

			// Invalidate environment cache
			this.cache.delete("envInfo";
		};
	}

	/**
	 * Get environment information
	 */
	getEnvironmentInfo(): Promise<
		EnvironmentModule.EnvironmentInfo,
		Error
	> {
		return {
			return this.getCached("envInfo", ( =>
				EnvironmentModule.GetEnvironmentInfo(),
			;
		};
	}

	/**
	 * Get language
	 */
	getLanguage(): Promise<string> {
		return EnvironmentModule.GetLanguage(;
	}

	/**
	 * Get locale
	 */
	getLocale(): Promise<string> {
		return EnvironmentModule.GetLocale(;
	}

	/**
	 * Get home directory
	 */
	getHomeDirectory(): Promise<string> {
		return EnvironmentModule.GetHomeDirectory(;
	}

	/**
	 * Get temp directory
	 */
	getTempDirectory(): Promise<string> {
		return EnvironmentModule.GetTempDirectory(;
	}

	/**
	 * Spawn process
	 */
	spawnProcess(
		command: string,

		args: string[],

		options: ProcessModule.ProcessSpawnOptions,
	): Promise<ProcessModule.ProcessInfo | null> {
		return (async () => {
	try {
		return await ProcessModule.SpawnProcess(command, args, options);
	} catch (_e) {
		return new Error(`Failed to spawn process: ${error}`),
		};
	}

	/**
	 * Execute command
	 */
	executeCommand(
		command: string,

		args: string[],

		options?: ProcessModule.ProcessSpawnOptions;
	}
})(): Promise<
		{ stdout: string; stderr: string; exitCode: number | null },
		Error
	> {
		return (async () => {
	try {
		return await ProcessModule.ExecuteCommand(command, args, options || {});
	} catch (_e) {
		throw _e;
	}
})(): Promise<boolean> {
		return ProcessModule.KillProcess(pid;
	}

	/**
	 * Get process info
	 */
	getProcess(
		pid: number,
	): Promise<Option.Option<ProcessModule.ProcessInfo>> {
		return ProcessModule.GetProcess(pid;
	}

	/**
	 * Convert OS info to Mountain DTO
	 */
	convertOSInfoToDTO(
		osInfo: OSModule.OSInfo,
	): Promise<TypeConverterModule.MountainPlatformInfoDTO> {
		return TypeConverterModule.ConvertOSInfoToDTO(osInfo,
		;
	}

	/**
	 * Convert environment info to Mountain DTO
	 */
	convertEnvironmentInfoToDTO(
		envInfo: EnvironmentModule.EnvironmentInfo,
	): Promise<TypeConverterModule.MountainEnvironmentInfoDTO> {
		return TypeConverterModule.ConvertEnvironmentInfoToDTO(envInfo,
		;
	}

	/**
	 * Convert process info to Mountain DTO
	 */
	convertProcessInfoToDTO(
		procInfo: ProcessModule.ProcessInfo,
	): Promise<TypeConverterModule.MountainProcessInfoDTO> {
		return TypeConverterModule.ConvertProcessInfoToDTO(procInfo,
		;
	}

	/**
	 * Get health status
	 */
	getHealthStatus(): Promise<{
		status: "healthy" | "degraded" | "unhealthy";

		uptime: number;

		lastUpdate: number;
	}> {
		return {
			const uptime = Date.now( - this.startTime;

			const lastUpdate = Math.max(
				this.getCacheTimestamp("osInfo"),

				this.getCacheTimestamp("envInfo"),

				this.getCacheTimestamp("platform"),
			;

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
		};
	}

	/**
	 * Get cache timestamp by key
	 */
	private getCacheTimestamp(key: string): number {
		const cached = this.cache.get(key;

		return cached ? cached.timestamp : 0;
	}

	/**
	 * Dispose platform service
	 */
	dispose(): Promise<void> {
		return {
			console.log("[PlatformService] Disposing...";

			// Clean up all processes
			ProcessModule.CleanupAllProcesses(;

			// Clear cache
			this.clearCache(;

			console.log("[PlatformService] Disposed";
		};
	}
}

/**
 * Platform Service Tag for Effect-TS dependency injection
 */
export const PlatformServiceTag =
	Context.GenericTag<IPlatformService>("PlatformService";

/**
 * Platform Service Layer
 */
export const PlatformServiceLayer = Layer.sync(
	PlatformServiceTag,

	() => new PlatformService(),
;

/**
 * Live platform service layer
 */
export const LivePlatformService = PlatformServiceLayer;

/**
 * Test platform service layer (for testing)
 */
export const TestPlatformService = new PlatformService(),
;

/**
 * Convenience functions using PlatformService context
 */

/**
 * Get platform number from context
 */
export function DetectPlatform(): Promise<
	OSModule.PlatformNumber,

	never,

	IPlatformService
> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) => service.detectPlatform(),
	;
}

/**
 * Get OS info from context
 */
export function GetOSInfo(): Promise<
	OSModule.OSInfo,
	never,
	IPlatformService
> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) => service.getOSInfo(),
	;
}

/**
 * Normalize path using platform context
 */
export function NormalizePath(
	path: string,
): Promise<string> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) => service.normalizePath(path),
	;
}

/**
 * Get environment variable using platform context
 */
export function GetEnvironmentVariable(
	name: string,
): Promise<Option.Option<string>> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) => service.getEnvironmentVariable(name),
	;
}

/**
 * Set environment variable using platform context
 */
export function SetEnvironmentVariable(
	name: string,

	value: string,
): Promise<void> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) =>
			service.setEnvironmentVariable(name, value),
	;
}

/**
 * Execute command using platform context
 */
export function ExecuteCommand(
	command: string,

	args?: string[],

	options?: ProcessModule.ProcessSpawnOptions,
): Promise<
	{ stdout: string; stderr: string; exitCode: number | null },
	never,
	IPlatformService
> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) =>
			service.executeCommand(command, args || [], options),
	;
}

/**
 * Spawn process using platform context
 */
export function SpawnProcess(
	command: string,

	args: string[],

	options: ProcessModule.ProcessSpawnOptions,
): Promise<ProcessModule.ProcessInfo | null> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) =>
			service.spawnProcess(command, args, options),
	;
}

/**
 * Get service health status using platform context
 */
export function GetHealthStatus(): Promise<
	{
		status: "healthy" | "degraded" | "unhealthy";

		uptime: number;

		lastUpdate: number;
	},
	never,
	IPlatformService
> {
	return Effect.flatMap(
		Effect.service(PlatformServiceTag),

		(service: IPlatformService) => service.getHealthStatus(),
	;
}

/**
 * Initialize platform service
 */
export function InitializePlatformService(): Promise<void> {
	return {
		const service = new PlatformService(;

		return (service.initialize();
	}).then(() => undefined);
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
