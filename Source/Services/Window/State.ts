/**
 * @module Services/Window/State
 * @description
 * Window state management using Effect-TS Ref.
 * Following Wind Effect-TS atomic module pattern.
 */

import { Context, Effect, Ref } from "effect";

import type { Logger, WindowStateConfig } from "./Types.js";

/**
 * Window state management service
 */
export interface WindowStateService {
	readonly getState: Effect.Effect<WindowStateConfig, never>;
	readonly setState: (
		state: WindowStateConfig,
	) => Effect.Effect<WindowStateConfig, never>;
	readonly onStateChange: Effect.Effect<void, never>;
}

/**
 * Tag for WindowStateService context
 */
export const WindowStateService = Context.Tag<WindowStateService>(
	"Service/Window/State",
);

/**
 * Create window state management layer
 */
export const WindowStateLive = Effect.gen(function* () {
	const Logger = yield* Effect.serviceOption(Logger);

	const stateRef = yield* Ref.make<WindowStateConfig>({
		focused: true,
		active: true,
	});

	const getState = Ref.get(stateRef);

	const setState = (newState: WindowStateConfig) =>
		Effect.gen(function* () {
			const currentState = yield* getState;

			// Only log if state actually changed
			if (
				currentState.focused !== newState.focused ||
				currentState.active !== newState.active
			) {
				yield* Logger.pipe(
					Effect.map((logger: Logger) =>
						logger.Info(
							`[WindowState] State changed: focused=${newState.focused}, active=${newState.active}`,
						),
					),
					Effect.orElse(() => Effect.void),
				);
			}

			yield* Ref.set(stateRef, newState);
			return newState;
		});

	const onStateChange = Effect.void;

	return WindowStateService.of({
		getState,
		setState,
		onStateChange,
	});
});

/**
 * Layer for window state management
 */
export const WindowStateLayer = Layer.effect(
	WindowStateService,
	WindowStateLive,
);
