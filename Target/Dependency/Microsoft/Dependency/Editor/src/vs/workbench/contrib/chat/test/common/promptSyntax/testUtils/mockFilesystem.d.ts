import { URI } from '../../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
/**
 * Represents a generic file system node.
 */
interface IMockFilesystemNode {
    name: string;
}
/**
 * Represents a `file` node.
 */
export interface IMockFile extends IMockFilesystemNode {
    contents: string | readonly string[];
}
/**
 * Represents a `folder` node.
 */
export interface IMockFolder extends IMockFilesystemNode {
    children: (IMockFolder | IMockFile)[];
}
/**
 * Type for a mocked file or a folder that has absolute path URI.
 */
type TWithURI<T extends IMockFilesystemNode> = T & {
    uri: URI;
};
/**
 * Utility to recursively creates provided filesystem structure.
 */
export declare class MockFilesystem {
    private readonly folders;
    private readonly fileService;
    constructor(folders: IMockFolder[], fileService: IFileService);
    /**
     * Starts the mock process.
     */
    mock(): Promise<TWithURI<IMockFolder>[]>;
    /**
     * The internal implementation of the filesystem mocking process.
     *
     * @throws If a folder or file in the filesystem structure already exists.
     * 		   This is to prevent subtle errors caused by overwriting existing files.
     */
    private mockFolder;
}
export {};
