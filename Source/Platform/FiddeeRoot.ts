/**
 * @file FIDDEE user dotfile root (`$HOME/.fiddee`).
 * @description
 * Mirrors the Rust atom at
 * `Element/Mountain/Source/IPC/WindServiceHandlers/Utilities/FiddeeRoot.rs`.
 *
 * Holds VS Code-style extensions (`~/.fiddee/extensions`), recently-opened
 * workspaces (`~/.fiddee/workspaces/RecentlyOpened.json`), per-extension
 * storage (`~/.fiddee/extensionStorage`, `~/.fiddee/globalStorage`), and the
 * background-daemon log/data trees (`~/.fiddee/logs`, `~/.fiddee/data`).
 *
 * Renamed from `~/.land` when the product shipped as FIDDEE; centralised
 * here so a future rename touches a single file per language.
 */

/** Leaf directory name. */
export const DotfileName: string = ".fiddee";

/**
 * Returns `$HOME/.fiddee` (or `$USERPROFILE\.fiddee` on Windows).
 * Falls back to the relative `.fiddee` path so callers always receive a
 * string - matches the previous `$HOME/.land` resolution semantics.
 */
export default function FiddeeRoot(): string {

	const Home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? null;

	if (typeof Home === "string" && Home.length > 0) {
		return `${Home}/${DotfileName}`;
	}

	return DotfileName;
}
