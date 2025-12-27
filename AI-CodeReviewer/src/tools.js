import fs from "fs/promises";
import path from "path";

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".html", ".css"];
const MAX_FILES = 50;
const MAX_FILE_SIZE = 200 * 1024; // 200 KB

export async function listFiles({ directory }) {
  const files = [];

  async function scan(dir) {
    if (files.length >= MAX_FILES) return;

    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (files.length >= MAX_FILES) break;

      const fullPath = path.join(dir, item.name);

      if (
        fullPath.includes("node_modules") ||
        fullPath.includes("dist") ||
        fullPath.includes("build")
      ) continue;

      if (item.isDirectory()) {
        await scan(fullPath);
      } else if (EXTENSIONS.includes(path.extname(item.name))) {
        const stat = await fs.stat(fullPath);
        if (stat.size <= MAX_FILE_SIZE) {
          files.push(fullPath);
        }
      }
    }
  }

  await scan(directory);
  return { files };
}

export async function readFile({ file_path }) {
  return { content: await fs.readFile(file_path, "utf-8") };
}

export async function writeFile({ file_path, content }) {
  await fs.writeFile(file_path, content, "utf-8");
  return { success: true };
}
