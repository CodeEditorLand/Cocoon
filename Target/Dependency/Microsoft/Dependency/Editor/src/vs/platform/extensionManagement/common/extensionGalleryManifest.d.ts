import { Event } from '../../../base/common/event.js';
export declare const enum ExtensionGalleryResourceType {
    ExtensionQueryService = "ExtensionQueryService",
    ExtensionLatestVersionUri = "ExtensionLatestVersionUriTemplate",
    ExtensionStatisticsUri = "ExtensionStatisticsUriTemplate",
    WebExtensionStatisticsUri = "WebExtensionStatisticsUriTemplate",
    PublisherViewUri = "PublisherViewUriTemplate",
    ExtensionDetailsViewUri = "ExtensionDetailsViewUriTemplate",
    ExtensionRatingViewUri = "ExtensionRatingViewUriTemplate",
    ExtensionResourceUri = "ExtensionResourceUriTemplate",
    ContactSupportUri = "ContactSupportUri"
}
export declare const enum Flag {
    None = "None",
    IncludeVersions = "IncludeVersions",
    IncludeFiles = "IncludeFiles",
    IncludeCategoryAndTags = "IncludeCategoryAndTags",
    IncludeSharedAccounts = "IncludeSharedAccounts",
    IncludeVersionProperties = "IncludeVersionProperties",
    ExcludeNonValidated = "ExcludeNonValidated",
    IncludeInstallationTargets = "IncludeInstallationTargets",
    IncludeAssetUri = "IncludeAssetUri",
    IncludeStatistics = "IncludeStatistics",
    IncludeLatestVersionOnly = "IncludeLatestVersionOnly",
    Unpublished = "Unpublished",
    IncludeNameConflictInfo = "IncludeNameConflictInfo",
    IncludeLatestPrereleaseAndStableVersionOnly = "IncludeLatestPrereleaseAndStableVersionOnly"
}
export type ExtensionGalleryManifestResource = {
    readonly id: string;
    readonly type: string;
};
export type ExtensionQueryCapabilityValue = {
    readonly name: string;
    readonly value: number;
};
export interface IExtensionGalleryManifest {
    readonly version: string;
    readonly resources: readonly ExtensionGalleryManifestResource[];
    readonly capabilities: {
        readonly extensionQuery: {
            readonly filtering?: readonly ExtensionQueryCapabilityValue[];
            readonly sorting?: readonly ExtensionQueryCapabilityValue[];
            readonly flags?: readonly ExtensionQueryCapabilityValue[];
        };
        readonly signing?: {
            readonly allPublicRepositorySigned: boolean;
            readonly allPrivateRepositorySigned?: boolean;
        };
        readonly extensions?: {
            readonly includePublicExtensions?: boolean;
            readonly includePrivateExtensions?: boolean;
        };
    };
}
export declare const IExtensionGalleryManifestService: import("../../instantiation/common/instantiation.js").ServiceIdentifier<IExtensionGalleryManifestService>;
export interface IExtensionGalleryManifestService {
    readonly _serviceBrand: undefined;
    readonly onDidChangeExtensionGalleryManifest: Event<IExtensionGalleryManifest | null>;
    isEnabled(): boolean;
    getExtensionGalleryManifest(): Promise<IExtensionGalleryManifest | null>;
}
export declare function getExtensionGalleryManifestResourceUri(manifest: IExtensionGalleryManifest, type: string): string | undefined;
export declare const ExtensionGalleryServiceUrlConfigKey = "extensions.gallery.serviceUrl";
