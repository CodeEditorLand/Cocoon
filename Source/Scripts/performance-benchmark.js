/**
 * Performance Benchmark Script for Cocoon
 * Tests the enhanced services with realistic workloads
 * 
 * Usage: node Scripts/performance-benchmark.js
 */

import { APIFactoryService } from '../Services/APIFactoryService.js';
import { ModuleInterceptorService } from '../Services/ModuleInterceptorService.js';
import { ErrorHandlingService } from '../Services/ErrorHandlingService.js';
import { SecurityService } from '../Services/SecurityService.js';

class PerformanceBenchmark {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    async runAllBenchmarks() {
        console.log('🚀 Starting Cocoon Performance Benchmark Suite\n');

        await this.benchmarkAPIFactoryService();
        await this.benchmarkModuleInterceptorService();
        await this.benchmarkErrorHandlingService();
        await this.benchmarkSecurityService();
        await this.benchmarkIntegrationScenarios();

        this.printResults();
    }

    async benchmarkAPIFactoryService() {
        console.log('📊 Benchmarking APIFactoryService...');
        
        const apiFactory = new APIFactoryService({}, {});
        
        // Benchmark API construction
        const constructionStart = Date.now();
        const constructionRequests = [];
        
        for (let i = 0; i < 100; i++) {
            constructionRequests.push(
                apiFactory.createVSCodeAPI({
                    extensionId: `test-extension-${i}`,
                    apiVersion: '1.85.0',
                    extensionDescription: { extensionLocation: `/extensions/test-${i}` },
                    securityContext: {}
                })
            );
        }
        
        await Promise.all(constructionRequests);
        const constructionTime = Date.now() - constructionStart;
        
        this.results.push({
            service: 'APIFactoryService',
            test: 'API Construction (100 extensions)',
            duration: constructionTime,
            avgPerRequest: constructionTime / 100,
            status: constructionTime < 5000 ? 'PASS' : 'FAIL'
        });

        // Benchmark cache performance
        const cacheStart = Date.now();
        for (let i = 0; i < 50; i++) {
            await apiFactory.createVSCodeAPI({
                extensionId: 'cached-extension',
                apiVersion: '1.85.0',
                extensionDescription: { extensionLocation: '/extensions/cached' },
                securityContext: {}
            });
        }
        const cacheTime = Date.now() - cacheStart;
        
        this.results.push({
            service: 'APIFactoryService',
            test: 'Cache Performance (50 cached requests)',
            duration: cacheTime,
            avgPerRequest: cacheTime / 50,
            status: cacheTime < 1000 ? 'PASS' : 'FAIL'
        });
    }

    async benchmarkModuleInterceptorService() {
        console.log('🔒 Benchmarking ModuleInterceptorService...');
        
        const interceptor = new ModuleInterceptorService();
        
        // Benchmark module resolution
        const resolutionStart = Date.now();
        const resolutionTests = [];
        
        const testModules = ['path', 'util', 'events', 'stream', 'buffer'];
        for (const moduleName of testModules) {
            resolutionTests.push(() => interceptor.resolveModule(moduleName, '/test/path'));
        }
        
        for (const test of resolutionTests) {
            try {
                test();
            } catch (error) {
                // Expected for non-existent modules
            }
        }
        const resolutionTime = Date.now() - resolutionStart;
        
        this.results.push({
            service: 'ModuleInterceptorService',
            test: 'Module Resolution (5 modules)',
            duration: resolutionTime,
            avgPerRequest: resolutionTime / testModules.length,
            status: resolutionTime < 100 ? 'PASS' : 'FAIL'
        });

        // Benchmark security analysis
        const securityStart = Date.now();
        const securityTests = [];
        
        for (let i = 0; i < 20; i++) {
            securityTests.push(() => interceptor.analyzeModuleSecurity(`test-module-${i}`));
        }
        
        for (const test of securityTests) {
            try {
                test();
            } catch (error) {
                // Expected for non-existent modules
            }
        }
        const securityTime = Date.now() - securityStart;
        
        this.results.push({
            service: 'ModuleInterceptorService',
            test: 'Security Analysis (20 modules)',
            duration: securityTime,
            avgPerRequest: securityTime / 20,
            status: securityTime < 500 ? 'PASS' : 'FAIL'
        });
    }

    async benchmarkErrorHandlingService() {
        console.log('🔄 Benchmarking ErrorHandlingService...');
        
        const errorHandler = new ErrorHandlingService();
        
        // Benchmark successful operations
        const successStart = Date.now();
        const successOperations = [];
        
        for (let i = 0; i < 50; i++) {
            successOperations.push(
                errorHandler.executeWithRetry(
                    () => Promise.resolve(`result-${i}`),
                    `success-operation-${i}`
                )
            );
        }
        
        await Promise.all(successOperations);
        const successTime = Date.now() - successStart;
        
        this.results.push({
            service: 'ErrorHandlingService',
            test: 'Successful Operations (50 operations)',
            duration: successTime,
            avgPerRequest: successTime / 50,
            status: successTime < 2000 ? 'PASS' : 'FAIL'
        });

        // Benchmark failing operations with retries
        const failureStart = Date.now();
        const failureOperations = [];
        
        for (let i = 0; i < 10; i++) {
            failureOperations.push(
                errorHandler.executeWithRetry(
                    () => Promise.reject(new Error('Simulated failure')),
                    `failure-operation-${i}`,
                    { maxRetries: 2 }
                )
            );
        }
        
        const failureResults = await Promise.allSettled(failureOperations);
        const failureTime = Date.now() - failureStart;
        
        this.results.push({
            service: 'ErrorHandlingService',
            test: 'Failing Operations (10 operations, 2 retries)',
            duration: failureTime,
            avgPerRequest: failureTime / 10,
            status: failureTime < 10000 ? 'PASS' : 'FAIL'
        });
    }

    async benchmarkSecurityService() {
        console.log('🛡️ Benchmarking SecurityService...');
        
        const securityService = new SecurityService();
        
        // Benchmark access checks
        const accessStart = Date.now();
        const accessChecks = [];
        
        for (let i = 0; i < 100; i++) {
            accessChecks.push(
                securityService.checkModuleAccess(`extension-${i}`, 'path')
            );
        }
        
        await Promise.all(accessChecks);
        const accessTime = Date.now() - accessStart;
        
        this.results.push({
            service: 'SecurityService',
            test: 'Access Checks (100 checks)',
            duration: accessTime,
            avgPerRequest: accessTime / 100,
            status: accessTime < 1000 ? 'PASS' : 'FAIL'
        });

        // Benchmark policy management
        const policyStart = Date.now();
        const policyOperations = [];
        
        for (let i = 0; i < 50; i++) {
            policyOperations.push(
                securityService.setSecurityPolicy(`extension-${i}`, {
                    extensionId: `extension-${i}`,
                    allowedModules: ['path', 'util'],
                    blockedModules: ['fs', 'child_process'],
                    maxMemoryUsage: 100,
                    maxExecutionTime: 30000,
                    allowedAPIs: ['commands', 'window'],
                    blockedAPIs: ['debug', 'terminal'],
                    networkAccess: false,
                    fileSystemAccess: false,
                    requireAuthentication: true
                })
            );
        }
        
        await Promise.all(policyOperations);
        const policyTime = Date.now() - policyStart;
        
        this.results.push({
            service: 'SecurityService',
            test: 'Policy Management (50 policies)',
            duration: policyTime,
            avgPerRequest: policyTime / 50,
            status: policyTime < 2000 ? 'PASS' : 'FAIL'
        });
    }

    async benchmarkIntegrationScenarios() {
        console.log('🔗 Benchmarking Integration Scenarios...');
        
        // Simulate extension activation scenario
        const integrationStart = Date.now();
        
        const securityService = new SecurityService();
        const moduleInterceptor = new ModuleInterceptorService();
        const errorHandler = new ErrorHandlingService();
        
        // Simulate extension loading workflow
        const extensionWorkflows = [];
        
        for (let i = 0; i < 20; i++) {
            extensionWorkflows.push(this.simulateExtensionActivation(i, securityService, moduleInterceptor, errorHandler));
        }
        
        await Promise.all(extensionWorkflows);
        const integrationTime = Date.now() - integrationStart;
        
        this.results.push({
            service: 'Integration',
            test: 'Extension Activation (20 extensions)',
            duration: integrationTime,
            avgPerRequest: integrationTime / 20,
            status: integrationTime < 10000 ? 'PASS' : 'FAIL'
        });
    }

    async simulateExtensionActivation(extensionId, securityService, moduleInterceptor, errorHandler) {
        // Simulate security check
        await securityService.checkModuleAccess(`extension-${extensionId}`, 'path');
        
        // Simulate module resolution
        moduleInterceptor.resolveModule('path', `/extensions/extension-${extensionId}`);
        
        // Simulate operation with error handling
        await errorHandler.executeWithRetry(
            () => Promise.resolve('activation-success'),
            `extension-activation-${extensionId}`
        );
    }

    printResults() {
        const totalTime = Date.now() - this.startTime;
        
        console.log('\n📈 Performance Benchmark Results:');
        console.log('='.repeat(80));
        
        let passed = 0;
        let failed = 0;
        
        this.results.forEach(result => {
            const statusIcon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${statusIcon} ${result.service} - ${result.test}`);
            console.log(`   Duration: ${result.duration}ms | Avg: ${result.avgPerRequest.toFixed(2)}ms/req`);
            
            if (result.status === 'PASS') passed++;
            else failed++;
        });
        
        console.log('='.repeat(80));
        console.log(`🏁 Total Benchmark Time: ${totalTime}ms`);
        console.log(`📊 Results: ${passed} PASSED, ${failed} FAILED`);
        
        if (failed === 0) {
            console.log('🎉 All benchmarks passed! Cocoon is ready for production.');
        } else {
            console.log('⚠️ Some benchmarks failed. Review the results above.');
        }
    }
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const benchmark = new PerformanceBenchmark();
    benchmark.runAllBenchmarks().catch(console.error);
}

export { PerformanceBenchmark };
