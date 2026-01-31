/**
 * @module PerformanceMonitoringService
 * @description
 * Real-time performance monitoring service for Cocoon extension host.
 * Collects metrics, detects performance regressions, and provides optimization insights.
 *
 * Based on enterprise monitoring patterns with low overhead.
 * Specification: IMPLEMENTATION-SPECIFICATION.md (Performance Monitoring Service)
 */
import { Layer } from "effect";
export interface PerformanceMetrics {
    extensionLoadTime: number;
    apiCallLatency: number;
    memoryUsage: number;
    cpuUsage: number;
    concurrentExtensions: number;
    errorRate: number;
    cacheHitRate: number;
    requestThroughput: number;
}
export interface PerformanceAlert {
    id: string;
    type: "warning" | "critical" | "info";
    message: string;
    metric: keyof PerformanceMetrics;
    threshold: number;
    currentValue: number;
    timestamp: number;
}
export interface OptimizationSuggestion {
    id: string;
    description: string;
    impact: "low" | "medium" | "high";
    difficulty: "easy" | "medium" | "hard";
    estimatedSavings: number;
}
/**
 * PerformanceMonitoringService implementation
 */
export declare class PerformanceMonitoringService {
    private metrics;
    private alerts;
    private optimizationSuggestions;
    private monitoringActive;
    private monitoringInterval;
    constructor();
    /**
     * Initialize performance monitoring
     */
    initialize(): Promise<void>;
    /**
     * Start monitoring loop
     */
    private startMonitoringLoop;
    /**
     * Initialize baseline metrics
     */
    private initializeBaselineMetrics;
    /**
     * Collect performance metrics with telemetry integration
     */
    private collectMetrics;
    /**
     * Send metrics to Mountain for aggregation
     */
    private sendMetricsToMountain;
    /**
     * Get accurate CPU usage measurement
     */
    private getCpuUsage;
    /**
     * Utility delay function
     */
    private delay;
    /**
     * Get accurate concurrent extension count
     */
    private getConcurrentExtensions;
    /**
     * Get accurate extension load time tracking
     */
    private getAverageExtensionLoadTime;
    /**
     * Get accurate API latency tracking
     */
    private getAverageApiLatency;
    /**
     * Get accurate error rate calculation
     */
    private getErrorRate;
    /**
     * Get accurate cache hit rate tracking
     */
    private getCacheHitRate;
    /**
     * Get accurate request throughput tracking
     */
    private getRequestThroughput;
    /**
     * Check for performance alerts
     */
    private checkAlerts;
    /**
     * Generate optimization suggestions
     */
    private generateOptimizations;
    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get active performance alerts
     */
    getAlerts(): PerformanceAlert[];
    /**
     * Get optimization suggestions
     */
    getOptimizations(): OptimizationSuggestion[];
    /**
     * Clear old alerts
     */
    clearOldAlerts(maxAge?: number): void;
    /**
     * Generate performance report
     */
    generateReport(): {
        summary: PerformanceMetrics;
        alerts: PerformanceAlert[];
        optimizations: OptimizationSuggestion[];
        recommendations: string[];
    };
    /**
     * Stop performance monitoring
     */
    stop(): Promise<void>;
}
/**
 * Service layer for PerformanceMonitoringService
 */
export declare const PerformanceMonitoringServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const PerformanceMonitoringServiceLive: Layer.Layer<unknown, never, never>;
//# sourceMappingURL=PerformanceMonitoringService.d.ts.map