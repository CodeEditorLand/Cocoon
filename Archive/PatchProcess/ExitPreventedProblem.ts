/**
 * @module Archive/PatchProcess/ExitPreventedProblem
 * @description Stub for archived exit prevention error type.
 */

export class ExitPreventedProblem extends Error {
	readonly _tag = "ExitPreventedProblem";
	constructor(Message?: string) {
		super(Message ?? "Process exit was prevented");
	}
}

export default ExitPreventedProblem;
