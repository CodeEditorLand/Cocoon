import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ICommandDetectionCapability } from '../../../../../platform/terminal/common/capabilities/capabilities.js';
import { IPromptInputModel } from '../../../../../platform/terminal/common/capabilities/commandDetection/promptInputModel.js';
import { ITerminalCompletion } from './terminalCompletionItem.js';
export declare class TerminalSuggestTelemetry extends Disposable {
    private readonly _promptInputModel;
    private readonly _telemetryService;
    private _acceptedCompletions;
    private _kindMap;
    constructor(commandDetection: ICommandDetectionCapability, _promptInputModel: IPromptInputModel, _telemetryService: ITelemetryService);
    acceptCompletion(sessionId: string, completion: ITerminalCompletion | undefined, commandLine?: string): void;
    /**
     * Logs the latency (ms) from completion request to completions shown.
     * @param sessionId The terminal session ID
     * @param latency The measured latency in ms
     * @param firstShownFor Object indicating if completions have been shown for window/shell
     */
    logCompletionLatency(sessionId: string, latency: number, firstShownFor: {
        window: boolean;
        shell: boolean;
    }): void;
    private _sendTelemetryInfo;
}
