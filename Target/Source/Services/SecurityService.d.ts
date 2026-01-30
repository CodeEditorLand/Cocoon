/**
 * @module SecurityService
 * @description
 * Enterprise security service for Cocoon extension host.
 * Provides security policy enforcement, audit logging, and incident response.
 *
 * Based on enterprise security patterns with zero-trust principles.
 * Specification: IMPLEMENTATION-SPECIFICATION.md (Security Service)
 */
import { Layer } from "effect";
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
export interface SecurityEvent {
    id: string;
    type: 'access' | 'violation' | 'authentication' | 'authorization';
    severity: 'low' | 'medium' | 'high' | 'critical';
    extensionId: string;
    action: string;
    resource: string;
    outcome: 'allowed' | 'denied' | 'blocked';
    timestamp: number;
    details: any;
}
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
export interface IncidentResponse {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    actions: string[];
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    timestamp: number;
    resolutionTime?: number;
}
/**
 * SecurityService implementation
 */
export declare class SecurityService {
    private readonly _serviceBrand;
    private policies;
    private auditLog;
    private incidents;
    private securityActive;
    constructor();
    /**
     * Initialize security service
     */
    initialize(): Promise<void>;
    /**
     * Load default security policies
     */
    private loadDefaultPolicies;
    /**
     * Load security policies from Mountain with advanced features
     */
    private loadSecurityPolicies;
    /**
     * Initialize advanced audit logging system
     */
    private initializeAuditLogging;
    /**
     * Rotate audit log to prevent memory bloat
     */
    private rotateAuditLog;
    /**
     * Initialize advanced incident response system
     */
    private initializeIncidentResponse;
    /**
     * Escalate critical incidents automatically
     */
    private escalateCriticalIncidents;
    /**
     * Send incident to Mountain for centralized tracking
     */
    private sendIncidentToMountain;
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
     * Get extension security policy
     */
    private getExtensionPolicy;
    /**
     * Log security event with advanced threat detection
     */
    private logSecurityEvent;
    /**
     * Detect threat patterns in real-time
     */
    private detectThreatPatterns;
    /**
     * Escalate security incident
     */
    private escalateIncident;
    /**
     * Set security policy for extension
     */
    setSecurityPolicy(extensionId: string, policy: SecurityPolicy): Promise<void>;
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
    /**
     * Save security state
     */
    private saveSecurityState;
}
/**
 * Service layer for SecurityService
 */
export declare const SecurityServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const SecurityServiceLive: Layer.Layer<unknown, never, never>;
//# sourceMappingURL=SecurityService.d.ts.map