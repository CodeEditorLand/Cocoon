/**
 * @module Handler/VscodeAPI/EnvNamespace
 * @description
 * Factory for the vscode.env namespace shim.
 * Values prefer init-data from Mountain (`ExtensionHostInitData.environment`)
 * and fall back to safe CodeEditorLand defaults.
 * Clipboard operations proxy to Mountain via MountainClient.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateEnvNamespace = (Context: HandlerContext) => {
	const Env = (Context.ExtensionHostInitData?.environment ?? {}) as Record<
		string,
		unknown
	>;

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

	return {
		appName: (Env["appName"] as string) ?? "CodeEditorLand",
		appRoot: (Env["appRoot"] as string) ?? "",
		appHost: (Env["appHost"] as string) ?? "desktop",
		uiKind: 1, // vscode.UIKind.Desktop
		language: (Env["language"] as string) ?? "en",
		machineId:
			(Context.ExtensionHostInitData?.telemetry?.machineId as string) ??
			(Env["machineId"] as string) ??
			"land",
		sessionId:
			(Env["sessionId"] as string) ??
			`land-session-${Date.now().toString(36)}`,
		isNewAppInstall: false,
		isTelemetryEnabled: false,
		onDidChangeTelemetryEnabled: () => ({ dispose: () => {} }),
		uriScheme: (Env["uriScheme"] as string) ?? "vscode",
		shell: (Env["shell"] as string) ?? process.env["SHELL"] ?? "",
		remoteName: undefined,
		clipboard: {
			// Clipboard.Read / Clipboard.Write not yet routed — catch returns
			// empty string / undefined until the Rust dispatcher adds them.
			readText: async (): Promise<string> =>
				(await Call<string>("Clipboard.Read", [])) ?? "",
			writeText: async (Value: string): Promise<void> => {
				await Call<void>("Clipboard.Write", [Value]);
			},
		},
		openExternal: async (Target: unknown): Promise<boolean> => {
			// NativeHost.OpenExternal not yet routed.
			const Ok = await Call<boolean>("NativeHost.OpenExternal", [
				typeof Target === "string" ? Target : String(Target),
			]);
			return Ok ?? false;
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
};

export default CreateEnvNamespace;
