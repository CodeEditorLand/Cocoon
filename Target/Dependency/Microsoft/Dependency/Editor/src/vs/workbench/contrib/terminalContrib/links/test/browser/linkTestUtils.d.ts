import { ITerminalLinkDetector, TerminalLinkType } from '../../browser/links.js';
import { URI } from '../../../../../../base/common/uri.js';
export declare function assertLinkHelper(text: string, expected: ({
    uri: URI;
    range: [number, number][];
} | {
    text: string;
    range: [number, number][];
})[], detector: ITerminalLinkDetector, expectedType: TerminalLinkType): Promise<void>;
