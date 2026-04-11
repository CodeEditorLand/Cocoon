// ============================================================================
// Element: Cocoon - 50-Level Deep Analysis
// ============================================================================
//
// Overview
// --------
// Cocoon is a Go-based Element providing the extension host and language server
// functionality.
//
// Level 1-10: Basic Structure
// ---------------------------
// | Level | Task                        | Status |
// |-------|-----------------------------|--------|
// | 1     | Verify Dockerfile exists    | ✅     |
// | 2     | Check docker-compose.yml    | ✅     |
// | 3     | Identify main packages      | ✅     |
// | 4     | Check Configuration/ directory | ✅  |
// | 5     | Check Archive/ directory    | ✅     |
// | 6     | Check Documentation/ directory | ✅ |
// | 7     | Identify Dependencies       | ✅     |
// | 8     | Check for tests/            | ⬜     |
// | 9     | Verify .github/workflows    | ⬜     |
// | 10    | Check for proto files       | ⬜     |
//
// Level 11-20: Module Analysis
// ----------------------------
// | Level | Task                        | Status |
// |-------|-----------------------------|--------|
// | 11    | Analyze Configuration modules | ⬜   |
// | 12    | Analyze Archive modules     | ⬜     |
// | 13    | Analyze service layer       | ⬜     |
// | 14    | Analyze gRPC server         | ⬜     |
// | 15    | Analyze extension host      | ⬜     |
// | 16    | Analyze language server     | ⬜     |
// | 17    | Check for Go modules        | ⬜     |
// | 18    | Verify Go version           | ⬜     |
// | 19    | Check Docker configuration  | ⬜     |
// | 20    | Analyze build process       | ⬜     |
//
// Level 21-30: Code Quality Checks (TODOs: 267)
// ----------------------------------------------
// | Level | Task                          | Status     |
// |-------|-------------------------------|------------|
// | 21    | Check for unused imports      | ⬜         |
// | 22    | Check for dead code           | ⬜         |
// | 23    | Check TODO comments (267!)    | 🔴 Priority |
// | 24    | Verify naming conventions     | ⬜         |
// | 25    | Check error handling          | ⬜         |
// | 26    | Verify logging patterns       | ⬜         |
// | 27    | Check for magic numbers       | ⬜         |
// | 28    | Verify concurrent patterns    | ⬜         |
// | 29    | Check goroutine usage         | ⬜         |
// | 30    | Verify test coverage          | ⬜         |
//
// Level 31-40: Convention Verification
// -------------------------------------
// | Level | Task                       | Status |
// |-------|----------------------------|--------|
// | 31    | Verify Go naming conventions | ⬜    |
// | 32    | Check package structure      | ⬜    |
// | 33    | Verify interface naming      | ⬜    |
// | 34    | Check struct naming          | ⬜    |
// | 35    | Verify function naming       | ⬜    |
// | 36    | Check error wrapping         | ⬜    |
// | 37    | Verify context usage         | ⬜    |
// | 38    | Check channel patterns       | ⬜    |
// | 39    | Verify mutex patterns        | ⬜    |
// | 40    | Check defer usage            | ⬜    |
//
// Level 41-50: Refactoring Priorities
// ------------------------------------
// | Level | Task                         | Status       |
// |-------|------------------------------|--------------|
// | 41    | Address language server TODOs| 🔴 267 TODOs |
// | 42    | Check for code duplication   | ⬜           |
// | 43    | Verify DRY principles        | ⬜           |
// | 44    | Check Go best practices      | ⬜           |
// | 45    | Identify performance issues  | ⬜           |
// | 46    | Check security considerations| ⬜           |
// | 47    | Verify error messages        | ⬜           |
// | 48    | Check documentation completeness | ⬜       |
// | 49    | Final Cocoon-specific audit  | ⬜           |
// | 50    | Complete Cocoon analysis     | ⬜           |
//
// TODO Breakdown for Cocoon
// --------------------------
// - **Language server features**: ~200+ TODOs
// - **Provider registrations**: ~50+ TODOs
// - **Document handling**: ~17+ TODOs
// - **Priority**: Critical - core functionality
//
// Summary for Cocoon
// ------------------
// - **Type**: Go/Docker Extension Host
// - **TODOs**: 267 found 🔴 (Highest)
// - **Key Features**: Language server, gRPC, Extension host
// - **Last Commit Changes**: f6c9ce8 (async/await patterns)
//
// Last Updated: 2026-03-03
// ============================================================================

/**
 * @module OldStyleServices
 * @description
 * Provides dependency injection for traditional Promise-based service architecture.
 * Legacy services that use async/await patterns instead of Effect-TS.
 *
 * @see {@link Element/Cocoon/Source/Services/} Legacy service implementations
 * @see {@link Element/Cocoon/Source/Orchestration/EffectServices.ts} Modern Effect-TS services
 *
 * @deprecated Prefer EffectServices for new implementations
 *
 * @author Cocoon Team
 * @since 1.0.0
 */

import { Layer } from "effect";

// ============================================================================
// OLD-STYLE SERVICE INTERFACES
// ============================================================================

import { IConfigurationService } from "../Interfaces/IConfigurationService.js";
import { IExtensionHostService } from "../Interfaces/IExtensionHostService.js";
import { IIPCService } from "../Interfaces/IIPCService.js";
import { IModuleInterceptorService } from "../Interfaces/IModuleInterceptorService.js";
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";
import { ITerminalService } from "../Interfaces/ITerminalService.js";
import { ISecurityService } from "../Interfaces/ISecurityService.js";
import { IPerformanceMonitoringService } from "../Interfaces/IPerformanceMonitoringService.js";
import { IErrorHandlingService } from "../Interfaces/IErrorHandlingService.js";
import { IAPIFactoryService } from "../Services/APIFactoryService.js";

// ============================================================================
// OLD-STYLE SERVICE LAYERS
// ============================================================================

import { ConfigurationLayer } from "../Services/Configuration.js";
import { ExtensionHostLayer } from "../Services/ExtensionHostService.js";
import { IPCServiceLayer } from "../Services/IPCService.js";
import { ModuleInterceptorServiceLayer } from "../Services/ModuleInterceptorService.js";
import { MountainClientServiceLayer } from "../Services/MountainClientService.js";
import { MountainGRPCClientLayer } from "../Services/MountainGRPCClient.js";
import { APIFactoryLayer } from "../Services/APIFactoryService.js";
import { TerminalServiceLayer } from "../Services/TerminalService.js";
import { SecurityServiceLive } from "../Services/SecurityService.js";
import { PerformanceMonitoringServiceLive } from "../Services/PerformanceMonitoringService.js";
import { ErrorHandlingServiceLive } from "../Services/ErrorHandlingService.js";

// ============================================================================
// OLD STYLE SERVICES
// ============================================================================

/**
 * Old Style Services
 *
 * Provides dependency injection for traditional service-based architecture.
 * Legacy services that use Promise-based async patterns.
 */
export default class OldStyleServices {
	/**
	 * Validate dependencies for old-style services
	 *
	 * @returns A composed Layer with all service dependencies
	 */
	validateDependencies() {
		return Layer.mergeAll(
			MountainClientServiceLayer,
			IPCServiceLayer,
			ConfigurationLayer,
			ModuleInterceptorServiceLayer,
			ExtensionHostLayer,
			APIFactoryLayer,
			TerminalServiceLayer,
			SecurityServiceLive,
			PerformanceMonitoringServiceLive,
			ErrorHandlingServiceLive,
		);
	}

	/**
	 * Compose application layer for old-style services
	 *
	 * Builds the dependency graph with proper layering:
	 * - Base Infrastructure (no dependencies)
	 * - Core Capabilities (depend on Base)
	 */
}