import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Mutable } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { INativeMcpDiscoveryData } from '../../../../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { DiscoverySource } from '../mcpConfiguration.js';
import { McpCollectionSortOrder, McpServerDefinition } from '../mcpTypes.js';
export interface NativeMpcDiscoveryAdapter {
    readonly remoteAuthority: string | null;
    readonly id: string;
    readonly order: number;
    readonly discoverySource: DiscoverySource;
    getFilePath(details: INativeMcpDiscoveryData): URI | undefined;
    adaptFile(contents: VSBuffer, details: INativeMcpDiscoveryData): McpServerDefinition[] | undefined;
}
export declare function claudeConfigToServerDefinition(idPrefix: string, contents: VSBuffer, cwd?: URI): Mutable<McpServerDefinition>[] | undefined;
export declare class ClaudeDesktopMpcDiscoveryAdapter implements NativeMpcDiscoveryAdapter {
    readonly remoteAuthority: string | null;
    id: string;
    readonly order = McpCollectionSortOrder.Filesystem;
    readonly discoverySource: DiscoverySource;
    constructor(remoteAuthority: string | null);
    getFilePath({ platform, winAppData, xdgHome, homedir }: INativeMcpDiscoveryData): URI | undefined;
    adaptFile(contents: VSBuffer, { homedir }: INativeMcpDiscoveryData): McpServerDefinition[] | undefined;
}
export declare class WindsurfDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    readonly discoverySource: DiscoverySource;
    constructor(remoteAuthority: string | null);
    getFilePath({ homedir }: INativeMcpDiscoveryData): URI | undefined;
}
export declare class CursorDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    readonly discoverySource: DiscoverySource;
    constructor(remoteAuthority: string | null);
    getFilePath({ homedir }: INativeMcpDiscoveryData): URI | undefined;
}
