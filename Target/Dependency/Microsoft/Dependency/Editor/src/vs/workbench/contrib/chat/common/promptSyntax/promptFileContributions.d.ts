import { IWorkbenchContribution } from '../../../../common/contributions.js';
/**
 * Function that registers all prompt-file related contributions.
 */
export declare function registerPromptFileContributions(): void;
/**
 * Type for a generic workbench contribution.
 */
export type TContribution = new (...args: any[]) => IWorkbenchContribution;
