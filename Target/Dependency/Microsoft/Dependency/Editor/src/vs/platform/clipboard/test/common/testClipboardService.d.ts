import { URI } from '../../../../base/common/uri.js';
import { IClipboardService } from '../../common/clipboardService.js';
export declare class TestClipboardService implements IClipboardService {
    readImage(): Promise<Uint8Array>;
    _serviceBrand: undefined;
    private text;
    triggerPaste(): Promise<void> | undefined;
    writeText(text: string, type?: string): Promise<void>;
    readText(type?: string): Promise<string>;
    private findText;
    readFindText(): Promise<string>;
    writeFindText(text: string): Promise<void>;
    private resources;
    writeResources(resources: URI[]): Promise<void>;
    readResources(): Promise<URI[]>;
    hasResources(): Promise<boolean>;
}
