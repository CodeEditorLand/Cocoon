/**
 * Simplified grpc type declarations for Mountain-Cocoon integration
 * This avoids namespace conflicts with service worker types
 */

declare module '@grpc/grpc-js' {
    export interface ClientUnaryCall {
        cancel(): void;
        getPeer(): string;
    }
    
    export interface sendUnaryData<T> {
        (error: any, response: T): void;
    }
    
    export interface handleUnaryCall<TRequest, TResponse> {
        (call: any, callback: sendUnaryData<TResponse>): void;
    }
    
    export interface Client {
        close(): void;
        getChannel(): any;
    }
}
