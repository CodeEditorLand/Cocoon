/*
 * File: Cocoon/Source/Service/SourceControlManagement/Service.ts
 * Role: Defines the interface and Context.Tag for the Source Control Management (SourceControlManagement) service.
 * Responsibilities:
 *   1. Declare the contract for the SourceControlManagement service, which allows extensions to create
 *      and manage SourceControl instances.
 *   2. This is the public API surface consumed by other services or the API factory.
 */

import { Context } from "effect";
import type { SourceControl, Uri } from "vscode";

export default class SourceControlManagementService extends Context.Tag(
	"Service/SourceControlManagement",
)<
	SourceControlManagementService,
	{
		/**
		 * Creates a new source control manager.
		 * @param Id A unique identifier for the source control.
		 * @param Label A human-readable label for the source control.
		 * @param RootURI The root of the repository.
		 */
		readonly CreateSourceControl: (
			Id: string,

			Label: string,

			RootURI?: Uri,
		) => SourceControl;

		/**
		 * Provides a readonly list of all source control instances.
		 */
		readonly Providers: readonly SourceControl[];

		// ... other SourceControlManagement service properties and events
	}
>() {}
