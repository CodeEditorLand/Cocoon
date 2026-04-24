var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IMountainClientService.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/ExtensionContext.ts
import { mkdirSync } from "node:fs";
import { Context, Effect as Effect2, Ref } from "effect";
var Memento = class {
  static {
    __name(this, "Memento");
  }
  Storage;
  ExtensionId;
  Logger;
  MountainClient;
  constructor(Storage, ExtensionId, Logger, MountainClient) {
    this.Storage = Storage;
    this.ExtensionId = ExtensionId;
    this.Logger = Logger;
    this.MountainClient = MountainClient;
    Effect2.runFork(
      Effect2.gen(function* () {
        try {
        } catch (error) {
        }
      })
    );
  }
  /**
   * Get a value from memento storage
   * @param key The key to get
   * @param defaultValue The default value if key doesn't exist
   * @returns The stored value or default
   */
  get(key, defaultValue) {
    const Map2 = Effect2.runSync(Ref.get(this.Storage));
    const Value = Map2.get(key);
    return Value !== void 0 ? Value : defaultValue;
  }
  /**
   * Get all keys in memento storage
   * @returns Array of all keys
   */
  keys() {
    const Map2 = Effect2.runSync(Ref.get(this.Storage));
    return Array.from(Map2.keys());
  }
  /**
   * Update a value in memento storage
   * @param key The key to update
   * @param value The new value
   * @returns Promise that resolves when update is complete
   */
  async update(key, value) {
    Effect2.runSync(
      Ref.update(this.Storage, (Map2) => {
        const NewMap = new Map2(Map2);
        NewMap.set(key, value);
        return NewMap;
      })
    );
    this.Logger.Debug(
      `[ExtensionContext] Memento updated: ${this.ExtensionId}.${key}`
    );
  }
  /**
   * Clear all values in memento storage
   */
  clear() {
    Effect2.runSync(Ref.set(this.Storage, /* @__PURE__ */ new Map()));
    this.Logger.Debug(
      `[ExtensionContext] Memento cleared: ${this.ExtensionId}`
    );
  }
};
var ExtensionSecretStorage = class {
  static {
    __name(this, "ExtensionSecretStorage");
  }
  ExtensionId;
  Logger;
  MountainClient;
  constructor(ExtensionId, Logger, MountainClient) {
    this.ExtensionId = ExtensionId;
    this.Logger = Logger;
    this.MountainClient = MountainClient ?? void 0;
  }
  /**
   * Get a secret from storage
   * @param key The key to get
   * @returns The secret value or undefined
   */
  async get(key) {
    if (this.MountainClient) {
      try {
        const result = await this.MountainClient.sendRequest(
          "getSecret",
          { key }
        );
        return result;
      } catch (error) {
        this.Logger.Error(
          `[ExtensionContext] Failed to get secret: ${this.ExtensionId}.${key}`,
          error
        );
        return void 0;
      }
    }
    this.Logger.Debug(
      `[ExtensionContext] Secret get: ${this.ExtensionId}.${key}`
    );
    return void 0;
  }
  /**
   * Store a secret
   * @param key The key to store
   * @param value The secret value
   */
  async store(key, value) {
    if (this.MountainClient) {
      try {
        await this.MountainClient.sendNotification("storeSecret", {
          key,
          value
        });
        this.Logger.Debug(
          `[ExtensionContext] Secret stored: ${this.ExtensionId}.${key}`
        );
        return;
      } catch (error) {
        this.Logger.Error(
          `[ExtensionContext] Failed to store secret: ${this.ExtensionId}.${key}`,
          error
        );
        throw error;
      }
    }
    this.Logger.Debug(
      `[ExtensionContext] Secret stored: ${this.ExtensionId}.${key}`
    );
  }
  /**
   * Delete a secret
   * @param key The key to delete
   */
  async delete(key) {
    if (this.MountainClient) {
      try {
        await this.MountainClient.sendNotification("deleteSecret", {
          key
        });
        this.Logger.Debug(
          `[ExtensionContext] Secret deleted: ${this.ExtensionId}.${key}`
        );
        return;
      } catch (error) {
        this.Logger.Error(
          `[ExtensionContext] Failed to delete secret: ${this.ExtensionId}.${key}`,
          error
        );
        throw error;
      }
    }
    this.Logger.Debug(
      `[ExtensionContext] Secret deleted: ${this.ExtensionId}.${key}`
    );
  }
  /**
   * Get the onDidChange secret event
   * @returns Event that fires when secrets change
   */
  get onDidChange() {
    return (Listener) => {
      const Disposable = {
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      };
      return Disposable;
    };
  }
};
var ExtensionContextService = class extends Effect2.Service()(
  "Service/ExtensionContext",
  {
    effect: Effect2.gen(function* () {
      const MountainClient = yield* IMountainClientService;
      const Configuration = yield* Context.Tag(
        "Service/Configuration"
      );
      const Logger = yield* Context.Tag("Service/Logger");
      const GlobalSubscriptionsRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const CreateExtensionContext = /* @__PURE__ */ __name((ExtensionId, ExtensionDescription) => Effect2.gen(function* () {
        Logger.Info(
          `[ExtensionContext] Creating context for extension: ${ExtensionId}`
        );
        const ExtensionPath = ExtensionDescription.extensionLocation.fsPath;
        const StoragePath = `${ExtensionPath}/.storage`;
        const GlobalStorageRoot = process.env.VSCODE_COCOON_GLOBAL_STORAGE ?? `${process.env.HOME ?? "."}/.land/globalStorage`;
        const GlobalStoragePath = `${GlobalStorageRoot}/${ExtensionId}`;
        try {
          mkdirSync(GlobalStoragePath, { recursive: true });
          mkdirSync(StoragePath, { recursive: true });
        } catch {
        }
        const WorkspaceStateRef = yield* Ref.make(
          /* @__PURE__ */ new Map()
        );
        const GlobalStateRef = yield* Ref.make(
          /* @__PURE__ */ new Map()
        );
        const WorkspaceState = new Memento(
          WorkspaceStateRef,
          ExtensionId,
          Logger,
          MountainClient
        );
        const GlobalState = new Memento(
          GlobalStateRef,
          ExtensionId,
          Logger,
          MountainClient
        );
        const SecretStorage = new ExtensionSecretStorage(
          ExtensionId,
          Logger,
          MountainClient
        );
        const Subscriptions = /* @__PURE__ */ new Set();
        yield* Ref.update(GlobalSubscriptionsRef, (GlobalMap) => {
          const NewMap = new Map(GlobalMap);
          if (!NewMap.has(ExtensionId)) {
            NewMap.set(ExtensionId, Subscriptions);
          }
          return NewMap;
        });
        const CreateTrackedDisposable = /* @__PURE__ */ __name((Disposable) => ({
          dispose: /* @__PURE__ */ __name(() => {
            Subscriptions.delete(Disposable);
            Disposable.dispose();
          }, "dispose")
        }), "CreateTrackedDisposable");
        const AsAbsolutePath = /* @__PURE__ */ __name((relativePath) => {
          const Uri = VSCode.Uri.joinPath(
            ExtensionDescription.extensionLocation,
            relativePath
          );
          return Uri.fsPath;
        }, "AsAbsolutePath");
        const ExtensionContext = {
          subscriptions: [],
          // VSCode's array-based subscriptions
          workspaceState: {
            get: /* @__PURE__ */ __name((key, defaultValue) => WorkspaceState.get(key, defaultValue), "get"),
            keys: /* @__PURE__ */ __name(() => WorkspaceState.keys(), "keys"),
            update: /* @__PURE__ */ __name((key, value) => WorkspaceState.update(key, value), "update")
          },
          globalState: {
            get: /* @__PURE__ */ __name((key, defaultValue) => GlobalState.get(key, defaultValue), "get"),
            keys: /* @__PURE__ */ __name(() => GlobalState.keys(), "keys"),
            update: /* @__PURE__ */ __name((key, value) => GlobalState.update(key, value), "update")
          },
          secrets: {
            get: /* @__PURE__ */ __name((key) => SecretStorage.get(key), "get"),
            store: /* @__PURE__ */ __name((key, value) => SecretStorage.store(key, value), "store"),
            delete: /* @__PURE__ */ __name((key) => SecretStorage.delete(key), "delete"),
            onDidChange: SecretStorage.onDidChange
          },
          storagePath: StoragePath,
          globalStoragePath: GlobalStoragePath,
          asAbsolutePath: AsAbsolutePath,
          extensionUri: ExtensionDescription.extensionLocation,
          extensionPath: ExtensionPath
          // TODO: Add extensionMode property when needed
          // extensionMode: VSCode.ExtensionMode,
        };
        Logger.Debug(
          `[ExtensionContext] Context created: ${ExtensionId} at ${ExtensionPath}`
        );
        return ExtensionContext;
      }), "CreateExtensionContext");
      const DisposeExtension = /* @__PURE__ */ __name((ExtensionId) => Effect2.gen(function* () {
        const GlobalSubscriptions = yield* Ref.get(
          GlobalSubscriptionsRef
        );
        const Subscriptions = GlobalSubscriptions.get(ExtensionId);
        if (Subscriptions) {
          Logger.Info(
            `[ExtensionContext] Disposing ${Subscriptions.size} subscriptions for ${ExtensionId}`
          );
          for (const Subscription of Subscriptions) {
            Subscription.dispose();
          }
          yield* Ref.update(
            GlobalSubscriptionsRef,
            (GlobalMap) => {
              const NewMap = new Map(GlobalMap);
              NewMap.delete(ExtensionId);
              return NewMap;
            }
          );
        }
        Logger.Debug(
          `[ExtensionContext] Extension ${ExtensionId} disposed`
        );
      }), "DisposeExtension");
      const ServiceImplementation = {
        CreateExtensionContext
      };
      Logger.Info(
        `[ExtensionContext] ExtensionContextService initialized`
      );
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "ExtensionContextService");
  }
};
export {
  ExtensionContextService,
  ExtensionSecretStorage,
  Memento
};
//# sourceMappingURL=ExtensionContext.js.map
