/**
 * @module Codegen/Extract/IsExtHostFile
 * @description
 * Predicate distinguishing extension-host source files from the
 * rest of VS Code's `src/` tree. Cocoon's codegen narrows
 * Wind's full-tree walker output to just the files that own the
 * `IExtHost*` decorator family.
 *
 * The convention is enforced by VS Code itself: every extension-
 * host service file lives under `src/vs/workbench/api/{common,
 * browser,worker,electron-browser}/extHost*.ts`. This predicate
 * scopes the scan to that subtree.
 * @category Extract
 */

const ExtHostPathSegments: ReadonlyArray<string> = [
	"vs/workbench/api/common/extHost",

	"vs/workbench/api/browser/extHost",

	"vs/workbench/api/worker/extHost",

	"vs/workbench/api/electron-browser/extHost",
];

export const IsExtHostFile = (sourcePath: string): boolean => {
	const Normalised = sourcePath.replace(/\\/g, "/");

	for (const Segment of ExtHostPathSegments) {
		if (Normalised.includes(Segment)) return true;
	}

	return false;
};

export default IsExtHostFile;
