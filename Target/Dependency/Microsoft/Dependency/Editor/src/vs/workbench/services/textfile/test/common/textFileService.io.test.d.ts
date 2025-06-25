import { ITextFileService } from '../../common/textfiles.js';
import { UTF16le, UTF8_with_bom, UTF16be } from '../../common/encoding.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
export interface Params {
    setup(): Promise<{
        service: ITextFileService;
        testDir: string;
    }>;
    teardown(): Promise<void>;
    exists(fsPath: string): Promise<boolean>;
    stat(fsPath: string): Promise<{
        size: number;
    }>;
    readFile(fsPath: string): Promise<VSBuffer | Buffer>;
    readFile(fsPath: string, encoding: string): Promise<string>;
    readFile(fsPath: string, encoding?: string): Promise<VSBuffer | Buffer | string>;
    detectEncodingByBOM(fsPath: string): Promise<typeof UTF16be | typeof UTF16le | typeof UTF8_with_bom | null>;
}
/**
 * Allows us to reuse test suite across different environments.
 *
 * It introduces a bit of complexity with setup and teardown, however
 * it helps us to ensure that tests are added for all environments at once,
 * hence helps us catch bugs better.
 */
export default function createSuite(params: Params): void;
