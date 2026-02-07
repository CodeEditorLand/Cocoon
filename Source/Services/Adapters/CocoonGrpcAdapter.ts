/**
 * @module CocoonGrpcAdapter
 * @description
 * Adapter that bridges VS Code's IPC protocol (Buffer-based) to Mountain's Vine protocol (gRPC).
 * Acts as the 'Spine Adapter' on the Cocoon side, translating internal IPC messages
 * into binary gRPC requests for the Mountain backend.
 *
 * Architecture:
 * [Extension] -> [IPCService] -> [CocoonGrpcAdapter] -> [MountainClientService] -> [Network]
 */

import { IMessagePassingProtocol, VSBuffer } from "../../Interfaces/IIPCService";
import { IMountainClientService } from "../../Interfaces/IMountainClientService";
import { GenericRequest } from "../../Generated/Vine";

/**
 * Adapter implementing IMessagePassingProtocol to pipe messages over gRPC
 */
export class CocoonGrpcAdapter implements IMessagePassingProtocol {
    private _onMessageCallback: ((buffer: VSBuffer) => void) | null = null;

    constructor(private mountainClient: IMountainClientService) {
        console.log("[CocoonGrpcAdapter] Initialized Spine Adapter");
    }

    /**
     * Called by IPCService when it wants to send a message to Mountain.
     * We interpret the buffer, wrap it in a Vine GenericRequest, and ship it via gRPC.
     */
    send(buffer: VSBuffer): void {
        try {
            // 1. Decode the IPC message (JSON over Buffer)
            // Note: In a real VS Code setup, this might be a custom binary format.
            // For Cocoon, we assume it's JSON for now based on IPCService implementation.
            const message = JSON.parse(buffer.toString());

            // 2. Filter: Only forward 'Requests' to Mountain
            // Responses to Mountain are handled differently (via callbacks)
            if (message.type === 'request' || message.type === 'call') {
                this.forwardRequestToMountain(message);
            } else if (message.type === 'response') {
                 // TODO: Handle responses if Mountain sends requests TO Cocoon
                 console.log("[CocoonGrpcAdapter] Dropping outbound response (not implemented):", message);
            }

        } catch (error) {
            console.error("[CocoonGrpcAdapter] Failed to forward message:", error);
        }
    }

    /**
     * Subscribe to incoming messages (from Mountain -> Cocoon)
     */
    onMessage(callback: (buffer: VSBuffer) => void): void {
        this._onMessageCallback = callback;
        // Hook into MountainClient's notification system if available
        // to receive unsolicited messages (events) from the backend.
    }

    /**
     * Internal: Forward the parsed IPC message to Mountain via gRPC
     */
    private async forwardRequestToMountain(ipcMessage: any): Promise<void> {
        // Map IPC Channel/Method to Vine Method string
        // e.g. channel="window", command="showMessage" -> "window.showMessage"
        const vineMethod = `${ipcMessage.channel}.${ipcMessage.command}`;

        try {
            console.log(`[CocoonGrpcAdapter] 🟢 Forwarding ${vineMethod} to Spine...`);

            // 3. Call Mountain (The Spine)
            // We await the result because IPC is request-response
            const result = await this.mountainClient.sendRequest(
                vineMethod,
                ipcMessage.arg // Pass arguments directly
            );

            // 4. Wrap result back into IPC Response format
            const responseMessage = {
                type: 'response',
                messageId: ipcMessage.messageId,
                success: true,
                result: result
            };

            // 5. Send back to IPCService (to resolve the Extension's promise)
            if (this._onMessageCallback) {
                // Convert to VSBuffer
                const responseBuffer = {
                    buffer: Buffer.from(JSON.stringify(responseMessage)),
                    byteLength: 0, // Mock
                    toString: () => JSON.stringify(responseMessage),
                    slice: () => ({} as any)
                } as unknown as VSBuffer; // Cast for simplicity in this stub

                this._onMessageCallback(responseBuffer);
            }

        } catch (error: any) {
            console.error(`[CocoonGrpcAdapter] 🔴 Spine call failed: ${vineMethod}`, error);

            // Send error response
            const errorMessage = {
                type: 'response',
                messageId: ipcMessage.messageId,
                success: false,
                error: error.message || "Unknown Spine Error"
            };

            if (this._onMessageCallback) {
                 const errorBuffer = {
                    buffer: Buffer.from(JSON.stringify(errorMessage)),
                    toString: () => JSON.stringify(errorMessage)
                } as unknown as VSBuffer;
                this._onMessageCallback(errorBuffer);
            }
        }
    }
}
