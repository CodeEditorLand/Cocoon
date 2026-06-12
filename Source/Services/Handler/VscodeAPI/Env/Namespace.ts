/**
 * @module Handler/VscodeAPI/EnvNamespace
 * @description
 * Factory for the vscode.env namespace shim.
 * Values prefer init-data from Mountain (`ExtensionHostInitData.environment`)
 * and fall back to safe CodeEditorLand defaults.
 * Clipboard operations proxy to Mountain via MountainClient.
 */

import LandFixLog from "../../../../Utility/Land/Fix/Log.js";

import type { HandlerContext } from "../../Handler/Context.js";

import WrapEnvNamespace from "../Wrap/Env/Namespace.js";

const CreateEnvNamespace = (Context: HandlerContext) => {

	const Env = (Context.ExtensionHostInitData?.environment ?? {}) as Record<
		string,

		unknown
	>;

	// Mountain delivers `appRoot` as a `file://` URL string
	// (`url::Url::from_directory_path`). VS Code's `vscode.env.appRoot`
	// contract is a plain filesystem path - extensions pass it straight to
	// `path.join(appRoot, 'product.json')` and then `fs.readFile`. Strip the
	// `file://` scheme and percent-decode so those calls resolve correctly.
	const NormalizeAppRoot = (Raw: unknown): string => {
		if (typeof Raw !== "string" || Raw.length === 0) {
			LandFixLog.Warn(
				"EnvNs",

				"appRoot empty or non-string, returning ''",
			);

			return "";
		}

		if (!Raw.startsWith("file:")) {
			LandFixLog.Info("EnvNs", `appRoot already plain path: ${Raw}`);

			return Raw;
		}

		try {
			const Normalised = decodeURIComponent(
				new URL(Raw).pathname,
			).replace(/\/$/, "");

			LandFixLog.Info(
				"EnvNs",

				`appRoot normalised file-URL ${Raw} → ${Normalised}`,
			);

			return Normalised;
		} catch (Error: unknown) {
			const Fallback = Raw.replace(/^file:\/\//, "").replace(/\/$/, "");

			LandFixLog.Warn(
				"EnvNs",

				`appRoot URL parse failed; fallback ${Raw} → ${Fallback}`,

				{
					error:
						Error instanceof globalThis.Error
							? Error.message
							: String(Error),
				},
			);

			return Fallback;
		}
	};

	const Call = async <T>(
		Method: string,

		Parameters: unknown,
	): Promise<T | undefined> => {
		try {
			return await (Context.MountainClient?.sendRequest(
				Method,

				Parameters,
			) as Promise<T> | undefined);
		} catch {
			return undefined;
		}
	};

	const Concrete = {
		appName: (Env["appName"] as string) ?? "fiddee",

		appRoot: NormalizeAppRoot(Env["appRoot"]),

		appHost: (Env["appHost"] as string) ?? "desktop",

		uiKind: 1, // vscode.UIKind.Desktop
		language: (Env["language"] as string) ?? "en",

		machineId:
			(Env["machineId"] as string) ??
			(Context.ExtensionHostInitData?.telemetryInfo?.machineId as
				| string
				| undefined) ??
			(Context.ExtensionHostInitData?.telemetry?.machineId as
				| string
				| undefined) ??
			"fiddee",

		// Stable session identity: prefer Mountain's init payload
		// (`environment.sessionId`, then `telemetryInfo.sessionId` - the
		// field Mountain actually populates today), then a spawn-time
		// `CocoonSessionId` env var, then a per-process fallback. A
		// regenerated id across orphan recovery desyncs Mountain's
		// session bookkeeping.
		sessionId:
			(Env["sessionId"] as string) ??
			(Context.ExtensionHostInitData?.telemetryInfo?.sessionId as
				| string
				| undefined) ??
			(Context.ExtensionHostInitData?.telemetry?.sessionId as
				| string
				| undefined) ??
			process.env["CocoonSessionId"] ??
			`land-session-${Date.now().toString(36)}`,

		// VS Code build identity strings. `vscode.tunnel-forwarding` and
		// other extensions read `appCommit?.substring(0, 7)` to surface a
		// short SHA in their telemetry / status bar. Returning the
		// heuristic Proxy fallback (a function) crashes that call with
		// `appCommit?.substring is not a function`. Default to empty
		// string so optional-chained reads short-circuit cleanly; populate
		// from build env when a real commit hash is available.
		appCommit: (Env["appCommit"] as string) ?? "",

		appQuality: (Env["appQuality"] as string) ?? "stable",

		isNewAppInstall: false,

		isAppPortable: false,

		isTelemetryEnabled: false,

		onDidChangeTelemetryEnabled: () => ({ dispose: () => {} }),

		// Land's bundled shell is fixed for the session; there's no UI to
		// switch it, so this event can never fire. Stub preserves the
		// disposable contract extensions rely on at activation time.
		onDidChangeShell: () => ({ dispose: () => {} }),

		uriScheme: (Env["uriScheme"] as string) ?? "vscode",

		shell: (Env["shell"] as string) ?? process.env["SHELL"] ?? "",

		remoteName: undefined,

		clipboard: {
			// Primary path: Mountain's Clipboard.Read / Clipboard.Write (when
			// routed). Fallback: native OS clipboard CLI - pbcopy/pbpaste on
			// macOS, xclip/wl-paste on Linux, clip/Get-Clipboard on Windows.
			// Each branch swallows errors so the extension host never crashes
			// on an unavailable clipboard subsystem.
			readText: async (): Promise<string> => {
				const FromMountain = await Call<string>("Clipboard.Read", []);

				if (typeof FromMountain === "string") return FromMountain;

				try {
					const { spawn } = await import("node:child_process");

					const Candidates =
						process.platform === "darwin"
							? [["pbpaste", []]]
							: process.platform === "win32"
								? [
										[
											"powershell.exe",

											[
												"-NoProfile",

												"-Command",

												"Get-Clipboard -Raw",
											],
										],
									]
								: [
										["wl-paste", ["-n"]],

										[
											"xclip",

											["-selection", "clipboard", "-o"],
										],

										["xsel", ["--clipboard", "--output"]],
									];

					for (const [Cmd, Args] of Candidates as Array<
						[string, string[]]
					>) {
						const Text = await new Promise<string | undefined>(
							(Resolve) => {
								const Child = spawn(Cmd, Args, {
									stdio: ["ignore", "pipe", "ignore"],
								});

								let Out = "";

								Child.stdout.on(
									"data",

									(Chunk: Buffer) =>
										(Out += Chunk.toString("utf8")),
								);

								Child.once("error", () => Resolve(undefined));

								Child.once("close", (Code) =>
									Resolve(Code === 0 ? Out : undefined),
								);
							},
						);

						if (Text !== undefined) return Text;
					}
				} catch {}

				return "";
			},

			writeText: async (Value: string): Promise<void> => {
				await Call<void>("Clipboard.Write", [Value]);

				// Mirror to native clipboard as well so the UI and terminal
				// stay in sync even when only one route is wired up.
				try {
					const { spawn } = await import("node:child_process");

					const Candidates =
						process.platform === "darwin"
							? [["pbcopy", []]]
							: process.platform === "win32"
								? [["clip.exe", []]]
								: [
										["wl-copy", []],

										["xclip", ["-selection", "clipboard"]],

										["xsel", ["--clipboard", "--input"]],
									];

					for (const [Cmd, Args] of Candidates as Array<
						[string, string[]]
					>) {
						const Ok = await new Promise<boolean>((Resolve) => {
							const Child = spawn(Cmd, Args, {
								stdio: ["pipe", "ignore", "ignore"],
							});

							Child.once("error", () => Resolve(false));

							Child.once("close", (Code) => Resolve(Code === 0));

							try {
								Child.stdin.end(Value);
							} catch {
								Resolve(false);
							}
						});

						if (Ok) return;
					}
				} catch {}
			},
		},

		openExternal: async (Target: unknown): Promise<boolean> => {
			const Url = typeof Target === "string" ? Target : String(Target);

			const OkFromMountain = await Call<boolean>(
				"NativeHost.OpenExternal",

				[Url],
			);

			if (OkFromMountain === true) return true;

			// Fallback: platform-native URL opener. `open` on macOS,
			// `xdg-open` on Linux, `cmd /c start` on Windows. Returns true iff
			// the child process exits successfully within 2 s.
			try {
				const { spawn } = await import("node:child_process");

				const Command: [string, string[]] =
					process.platform === "darwin"
						? ["open", [Url]]
						: process.platform === "win32"
							? ["cmd.exe", ["/c", "start", "", Url]]
							: ["xdg-open", [Url]];

				const Ok = await new Promise<boolean>((Resolve) => {
					const Child = spawn(Command[0], Command[1], {
						stdio: "ignore",
						detached: true,
					});

					const Timer = setTimeout(() => {
						try {
							Child.kill();
						} catch {}

						Resolve(false);
					}, 2_000);

					Child.once("error", () => {
						clearTimeout(Timer);

						Resolve(false);
					});

					Child.once("close", (Code) => {
						clearTimeout(Timer);

						Resolve(Code === 0);
					});

					Child.unref();
				});

				return Ok;
			} catch {
				return false;
			}
		},

		asExternalUri: async (Target: unknown) => Target,

		createTelemetryLogger: (_Sender: unknown, _Options?: unknown) => ({
			isUsageEnabled: false,
			isErrorsEnabled: false,
			onDidChangeEnableStates: () => ({ dispose: () => {} }),
			logUsage: (_EventName: string, _Data?: unknown) => {},
			logError: (_EventNameOrError: unknown, _Data?: unknown) => {},
			dispose: () => {},
		}),

		logLevel: 2,

		onDidChangeLogLevel: () => ({ dispose: () => {} }),
	};

	return WrapEnvNamespace(Concrete);
};

export default CreateEnvNamespace;
