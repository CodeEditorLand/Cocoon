/*
 * File: Cocoon/Source/Service/SourceControlManagement/Service.ts
 * Role: Defines the interface and provides the default "live" implementation for the SCM service.
 * Responsibilities:
 *   - Declare the contract for creating and managing SourceControl instances.
 */

import { Effect } from "effect";
import type { SourceControl, Uri } from "vscode";

export class SourceControlManagement extends Effect.Service<SourceControlManagement>()(
	"Service/SourceControlManagement",
	{
		// This service is not yet implemented, so we provide a sync constructor
		// that returns a stubbed implementation.
		sync: () => ({
			CreateSourceControl: (
				Id: string,
				Label: string,
				RootURI?: Uri,
			): SourceControl => {
				// Stubbed implementation
				console.warn(
					`STUB: SourceControlManagement.CreateSourceControl called for ${Id}`,
				);
				return {} as SourceControl;
			},
			get Providers(): readonly SourceControl[] {
				// Stubbed implementation
				return [];
			},
		}),
	},
) {}
