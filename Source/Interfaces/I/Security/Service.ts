/**
 * @module ISecurityService
 * @description
 * Interface for enterprise security service.
 * Provides security policy enforcement, audit logging, and incident response.
 */

// Security policy interface
export interface SecurityPolicy {

	extensionId: string;

	allowedModules: string[];

	blockedModules: string[];

	maxMemoryUsage: number;

	maxExecutionTime: number;

	allowedAPIs: string[];

	blockedAPIs: string[];

	networkAccess: boolean;

	fileSystemAccess: boolean;

	requireAuthentication: boolean;
}

// Security event interface
export interface SecurityEvent {

	id: string;

	type: "access" | "violation" | "authentication" | "authorization";

	severity: "low" | "medium" | "high" | "critical";

	extensionId: string;

	action: string;

	resource: string;

	outcome: "allowed" | "denied" | "blocked";

	timestamp: number;

	details: any;
}

// Audit log interface
export interface AuditLog {

	events: SecurityEvent[];

	summary: {
		totalEvents: number;

		violations: number;

		authenticationFailures: number;

		authorizationFailures: number;

		lastUpdated: number;
	};
}

// Incident response interface
export interface IncidentResponse {

	id: string;

	severity: "low" | "medium" | "high" | "critical";

	description: string;

	actions: string[];

	status: "open" | "investigating" | "resolved" | "closed";

	timestamp: number;

	resolutionTime?: number;
}

export interface ISecurityService {

	readonly _serviceBrand: undefined;

	/**
	 * Initialize security service
	 */
	initialize(): Promise<void>;

	/**
	 * Check module access permission
	 */
	checkModuleAccess(extensionId: string, moduleId: string): Promise<boolean>;

	/**
	 * Check API access permission
	 */
	checkAPIAccess(extensionId: string, apiName: string): Promise<boolean>;

	/**
	 * Check network access permission
	 */
	checkNetworkAccess(extensionId: string): Promise<boolean>;

	/**
	 * Check file system access permission
	 */
	checkFileSystemAccess(extensionId: string): Promise<boolean>;

	/**
	 * Set security policy for extension
	 */
	setSecurityPolicy(
		extensionId: string,

		policy: SecurityPolicy,
	): Promise<void>;

	/**
	 * Get security policy for extension
	 */
	getSecurityPolicy(extensionId: string): Promise<SecurityPolicy | undefined>;

	/**
	 * Get audit log
	 */
	getAuditLog(): AuditLog;

	/**
	 * Get active incidents
	 */
	getActiveIncidents(): IncidentResponse[];

	/**
	 * Resolve incident
	 */
	resolveIncident(incidentId: string, resolution: string): Promise<void>;

	/**
	 * Generate security report
	 */
	generateSecurityReport(): {
		policies: number;

		auditLog: AuditLog;

		activeIncidents: IncidentResponse[];

		recommendations: string[];
	};

	/**
	 * Stop security service
	 */
	stop(): Promise<void>;
}

/**
 * Effect context for SecurityService
 */
export const ISecurityService: unique symbol = Symbol.for("ISecurityService";
