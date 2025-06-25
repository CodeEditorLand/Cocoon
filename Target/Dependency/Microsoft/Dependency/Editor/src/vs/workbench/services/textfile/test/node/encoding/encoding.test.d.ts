import * as encoding from '../../../common/encoding.js';
export declare function detectEncodingByBOM(file: string): Promise<typeof encoding.UTF16be | typeof encoding.UTF16le | typeof encoding.UTF8_with_bom | null>;
