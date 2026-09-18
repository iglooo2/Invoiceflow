#!/usr/bin/env node
/**
 * Package Prisma's rust-free query-compiler WASM for Cloudflare Workers.
 *
 * prisma-client-js with engineType=client loads WASM via fs.readFileSync +
 * `new WebAssembly.Module(bytes)`. OpenNext/wrangler never copies that file
 * into the Worker FS (`/bundle/node_modules/.prisma/client/...`), and workerd
 * also forbids compiling WASM from bytes. The Worker entry must import the
 * `.wasm` as a CompiledWasm module and Prisma must reuse that module.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WASM_FILE = "query_compiler_bg.wasm";
export const WASM_DIR_NAME = "prisma-wasm";
export const GLOBAL_WASM = "__PRISMA_QUERY_COMPILER_WASM";

const WORKER_IMPORT = `import ${GLOBAL_WASM} from "./${WASM_DIR_NAME}/${WASM_FILE}";
globalThis.${GLOBAL_WASM} = ${GLOBAL_WASM};
`;

const FS_LOADER =
  /getQueryCompilerWasmModule:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?return new WebAssembly\.Module\(queryCompilerWasmFileBytes\)\s*\}/;

const HASH_LOADER =
  /getQueryCompilerWasmModule:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await import\(['"]#wasm-compiler-loader['"]\)[\s\S]*?return compiler\s*\}/;

export function wasmLoaderReplacement(specifier = `./${WASM_FILE}`) {
  return `getQueryCompilerWasmModule: async () => {
        if (globalThis.${GLOBAL_WASM}) {
          return globalThis.${GLOBAL_WASM};
        }
        const queryCompilerWasm = await import(${JSON.stringify(specifier)})
        return queryCompilerWasm.default ?? queryCompilerWasm
      }`;
}

export function patchPrismaWasmLoader(source, specifier = `./${WASM_FILE}`) {
  const replacement = wasmLoaderReplacement(specifier);
  let out = source.replace(FS_LOADER, replacement).replace(HASH_LOADER, replacement);
  if (
    out.includes('path.join(__dirname, "schema.prisma")') &&
    !out.includes(`path.join(__dirname, "${WASM_FILE}")`)
  ) {
    out = out.replace(
      'path.join(__dirname, "schema.prisma");',
      `path.join(__dirname, "schema.prisma");\npath.join(__dirname, "${WASM_FILE}");`,
    );
  }
  return out;
}

export function patchPrismaClientDir(clientDir) {
  const patched = [];
  for (const name of ["index.js", "wasm.js"]) {
    const file = path.join(clientDir, name);
    if (!existsSync(file)) continue;
    const before = readFileSync(file, "utf8");
    const after = patchPrismaWasmLoader(before);
    if (after !== before) {
      writeFileSync(file, after);
      patched.push(name);
    }
  }
  return patched;
}

export function prismaClientWasmPath(root) {
  return path.join(root, "node_modules/.prisma/client", WASM_FILE);
}

export function openNextWasmPath(openNextDir) {
  return path.join(openNextDir, WASM_DIR_NAME, WASM_FILE);
}

export function copyPrismaWasmToOpenNext(root, openNextDir = path.join(root, ".open-next")) {
  const src = prismaClientWasmPath(root);
  if (!existsSync(src)) {
    throw new Error(
      `Prisma ${WASM_FILE} was not generated (expected ${src}). Run prisma generate with PRISMA_PROVIDER=postgresql.`,
    );
  }
  const dest = openNextWasmPath(openNextDir);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  return dest;
}

export function injectWorkerWasmImport(workerSource) {
  if (workerSource.includes(GLOBAL_WASM) && workerSource.includes(WASM_FILE)) {
    return workerSource;
  }
  return `${WORKER_IMPORT}${workerSource}`;
}

function wasmSpecifierFrom(fromFile, wasmDest) {
  const rel = path.relative(path.dirname(fromFile), wasmDest).split(path.sep).join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** Rewrite only ESM import specifiers, not random strings (e.g. next.config traces). */
export function rewriteWasmImports(source, fromFile, wasmDest) {
  const spec = wasmSpecifierFrom(fromFile, wasmDest);
  return source
    .replace(
      /\bfrom\s+(["'`])([^"'`]*query_compiler_bg\.wasm(?:\?module)?)\1/g,
      `from "${spec}"`,
    )
    .replace(
      /\bimport\s*\(\s*(["'`])([^"'`]*query_compiler_bg\.wasm(?:\?module)?)\1\s*\)/g,
      `import("${spec}")`,
    );
}

export function wireOpenNextPrismaWasm(root, openNextDir = path.join(root, ".open-next")) {
  const dest = copyPrismaWasmToOpenNext(root, openNextDir);
  const workerFile = path.join(openNextDir, "worker.js");
  if (!existsSync(workerFile)) {
    throw new Error(`OpenNext worker entry missing: ${workerFile}`);
  }
  writeFileSync(workerFile, injectWorkerWasmImport(readFileSync(workerFile, "utf8")));

  const handlerFile = path.join(openNextDir, "server-functions/default/handler.mjs");
  if (existsSync(handlerFile)) {
    const spec = wasmSpecifierFrom(handlerFile, dest);
    let handler = readFileSync(handlerFile, "utf8");
    handler = patchPrismaWasmLoader(handler, spec);
    handler = rewriteWasmImports(handler, handlerFile, dest);
    writeFileSync(handlerFile, handler);
  }
  return dest;
}

export function assertOpenNextHasPrismaWasm(openNextDir) {
  const dest = openNextWasmPath(openNextDir);
  if (!existsSync(dest)) {
    throw new Error(`Missing ${dest}`);
  }
  const size = statSync(dest).size;
  if (size < 50_000) {
    throw new Error(`${dest} is too small (${size} bytes) to be Prisma query-compiler WASM`);
  }
  const worker = readFileSync(path.join(openNextDir, "worker.js"), "utf8");
  if (!worker.includes(`./${WASM_DIR_NAME}/${WASM_FILE}`)) {
    throw new Error("OpenNext worker.js does not import Prisma query_compiler_bg.wasm");
  }
  const handlerFile = path.join(openNextDir, "server-functions/default/handler.mjs");
  if (existsSync(handlerFile)) {
    const handler = readFileSync(handlerFile, "utf8");
    if (/new WebAssembly\.Module\(queryCompilerWasmFileBytes\)/.test(handler)) {
      throw new Error("handler.mjs still compiles Prisma WASM from fs.readFileSync bytes");
    }
    if (!handler.includes(GLOBAL_WASM) && !handler.includes(`${WASM_DIR_NAME}/${WASM_FILE}`)) {
      throw new Error("handler.mjs does not load Prisma WASM from the Worker module import");
    }
  }
  return { path: dest, bytes: size };
}

function main() {
  const root = path.join(import.meta.dirname, "..");
  const cmd = process.argv[2];
  if (cmd === "patch") {
    const patched = patchPrismaClientDir(path.join(root, "node_modules/.prisma/client"));
    console.log(`Patched Prisma client WASM loader (${patched.join(", ") || "no files changed"})`);
    return;
  }
  if (cmd === "wire") {
    const dest = wireOpenNextPrismaWasm(root);
    const info = assertOpenNextHasPrismaWasm(path.join(root, ".open-next"));
    console.log(`Prisma WASM in Worker bundle: ${dest} (${info.bytes} bytes)`);
    return;
  }
  console.error("Usage: node scripts/prisma-cf-wasm.mjs <patch|wire>");
  process.exit(1);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main();
}
