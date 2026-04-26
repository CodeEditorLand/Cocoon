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

// Source/Services/FileSystemService.ts
import { Context, Effect as Effect2, Layer } from "effect";
var IFileSystemService = Context.Tag();
var FileSystemService = class {
  constructor(mountainClient) {
    this.mountainClient = mountainClient;
  }
  mountainClient;
  static {
    __name(this, "FileSystemService");
  }
  async stat(uri) {
    const Path = uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "");
    const Response = await this.mountainClient.sendRequest("fs.stat", Path);
    if (!Response) throw new Error(`File not found: ${Path}`);
    return {
      type: Response.type ?? 1,
      ctime: 0,
      mtime: Response.mtime ?? 0,
      size: Response.size ?? 0
    };
  }
  async readFile(uri) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    const response = await this.mountainClient.sendRequest(
      "fs.readFile",
      uri.fsPath
    );
    return response;
  }
  async writeFile(uri, content) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    await this.mountainClient.sendRequest("fs.writeFile", {
      path: uri.fsPath,
      content: Array.from(content)
      // Serialize buffer to array
    });
  }
  async readDirectory(uri) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    const Path = uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "");
    const Entries = await this.mountainClient.sendRequest("fs.listDir", Path);
    return (Entries ?? []).map(
      (E) => typeof E === "string" ? [E, 1] : [E.name, E.type]
    );
  }
  async createDirectory(uri) {
    await this.mountainClient.sendRequest("fs.createDir", uri.fsPath);
  }
  async delete(uri, options) {
    await this.mountainClient.sendRequest("fs.delete", uri.fsPath);
  }
  async rename(source, target, options) {
    await this.mountainClient.sendRequest("fs.rename", {
      from: source.fsPath,
      to: target.fsPath
    });
  }
};
var FileSystemServiceLayer = Layer.effect(
  IFileSystemService,
  Effect2.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    return new FileSystemService(mountainClient);
  })
);
export {
  FileSystemService,
  FileSystemServiceLayer,
  IFileSystemService
};
//# sourceMappingURL=FileSystemService.js.map
