export interface MockFileNode {
  type: "file" | "dir";
  content?: string;
}

/** 规范化路径 */
const normalizePath = (path: string): string => path.replace(/\/+/gu, "/").replace(/\/$/u, "");

/** 内存文件系统，用于模拟 wx.getFileSystemManager */
export class FileSystemManager {
  private readonly files = new Map<string, MockFileNode>();

  statSync(path: string): { isFile: () => boolean; isDirectory: () => boolean } {
    const node = this.files.get(normalizePath(path));

    if (!node) throw new Error(`ENOENT: ${path}`);

    return {
      isFile: (): boolean => node.type === "file",
      isDirectory: (): boolean => node.type === "dir",
    };
  }

  readFileSync(path: string, encoding?: string): string | ArrayBuffer {
    const node = this.files.get(normalizePath(path));

    if (!node || node.type !== "file") throw new Error(`ENOENT: ${path}`);

    const content = node.content ?? "";

    // 真实微信：未指定 encoding 时返回 ArrayBuffer
    if (!encoding || encoding === "binary") return new TextEncoder().encode(content).buffer;

    return content;
  }

  writeFileSync(path: string, data: string | ArrayBuffer, _encoding?: string): void {
    this.files.set(normalizePath(path), {
      type: "file",
      content: typeof data === "string" ? data : new TextDecoder().decode(data),
    });
  }

  mkdirSync(path: string, recursive = false): void {
    const dir = normalizePath(path);

    if (!recursive) {
      const parent = dir.slice(0, dir.lastIndexOf("/"));

      if (parent !== "" && !this.files.has(parent)) throw new Error(`ENOENT: ${parent}`);
    }

    this.files.set(dir, { type: "dir" });
  }

  rmdirSync(path: string, recursive = false): void {
    const dir = normalizePath(path);

    if (recursive) {
      [...this.files.keys()].forEach((key) => {
        if (key.startsWith(`${dir}/`)) this.files.delete(key);
      });
    }

    this.files.delete(dir);
  }

  unlinkSync(path: string): void {
    this.files.delete(normalizePath(path));
  }

  readdirSync(path: string): string[] {
    const dir = normalizePath(path);
    const names = new Set<string>();

    for (const key of this.files.keys()) {
      if (key === dir) continue;
      if (key.startsWith(`${dir}/`)) {
        const [name = ""] = key.slice(dir.length + 1).split("/");

        if (name !== "") names.add(name);
      }
    }

    return [...names];
  }

  saveFileSync(tempFilePath: string, filePath: string): string {
    const dir = normalizePath(filePath);

    // 真实微信：目标文件已存在时保存失败
    if (this.files.has(dir)) throw new Error(`EEXIST: ${filePath}`);

    const source = this.files.get(normalizePath(tempFilePath));

    this.files.set(dir, {
      type: "file",
      content: source?.type === "file" ? (source.content ?? "") : "",
    });
    return filePath;
  }

  unzip(options: {
    zipFilePath: string;
    targetPath: string;
    success: () => void;
    fail?: (result: { errCode: number; errMsg: string }) => void;
  }): void {
    this.files.set(normalizePath(options.targetPath), { type: "dir" });
    options.success();
  }
}

/** 获取文件系统管理器 */
export const getFileSystemManager = (): FileSystemManager => new FileSystemManager();
