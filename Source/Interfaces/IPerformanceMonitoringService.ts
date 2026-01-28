/**
 * @module IPerformanceMonitoringService
 * @description
 * Interface for performance monitoring service.
 * Provides real-time performance metrics collection and optimization insights.
 */

import { Context } from "effect";

// Performance metrics interface
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

// Performance alert interface
export interface PerformanceAlert {
    id: string;
    type: 'warning' | 'critical' | 'info';
    message: string;
    metric: keyof PerformanceMetrics;
    threshold: number;
    currentValue: number;
    timestamp: number;
}

// Optimization suggestion interface
export interface OptimizationSuggestion {
    id: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedSavings: number;
}

export interface IPerformanceMonitoringService {
    readonly _serviceBrand: undefined;
    
    /**
     * Initialize performance monitoring
     */
    initialize(): Promise<void>;
    
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
 * Effect context for PerformanceMonitoringService
 */
export const IPerformanceMonitoringService = Context.GenericTag<IPerformanceMonitoringService>("IPerformanceMonitoringService");
