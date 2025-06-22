/*
 * File: Cocoon/Source/Service/SourceControlManagement/Service.ts
 *
 * This file defines the interface and Context.Tag for the Source Control Management service.
 * Its responsibilities are to declare the contract for creating and managing SourceControl instances.
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
	}
>() {}
