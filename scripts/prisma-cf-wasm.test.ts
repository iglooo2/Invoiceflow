import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  GLOBAL_WASM,
  WASM_FILE,
  assertOpenNextHasPrismaWasm,
  injectWorkerWasmImport,
  patchPrismaWasmLoader,
  wireOpenNextPrismaWasm,
} from "./prisma-cf-wasm.mjs";

const FS_LOADER = `config.compilerWasm = {
      getRuntime: async () => require('./query_compiler_bg.js'),
      getQueryCompilerWasmModule: async () => {
        const queryCompilerWasmFilePath = require('path').join(config.dirname, 'query_compiler_bg.wasm')
        const queryCompilerWasmFileBytes = require('fs').readFileSync(queryCompilerWasmFilePath)

        return new WebAssembly.Module(queryCompilerWasmFileBytes)
      }
    }

path.join(__dirname, "schema.prisma");
path.join(process.cwd(), "node_modules/.prisma/client/schema.prisma")
`;

const HASH_LOADER = `config.compilerWasm = {
  getRuntime: async () => require('./query_compiler_bg.js'),
  getQueryCompilerWasmModule: async () => {
    const loader = (await import('#wasm-compiler-loader')).default
    const compiler = (await loader).default
    return compiler
  }
}
`;

test("replaces fs.readFileSync WASM loader with a module import", () => {
  const patched = patchPrismaWasmLoader(FS_LOADER);
  assert.match(patched, new RegExp(`import\\('./${WASM_FILE}'\\)`));
  assert.match(patched, new RegExp(GLOBAL_WASM));
  assert.doesNotMatch(patched, /readFileSync/);
  assert.doesNotMatch(patched, /new WebAssembly\.Module/);
  assert.match(patched, new RegExp(`path.join\\(__dirname, "${WASM_FILE}"\\)`));
});

test("replaces #wasm-compiler-loader with a direct wasm import", () => {
  const patched = patchPrismaWasmLoader(HASH_LOADER);
  assert.match(patched, new RegExp(`import\\('./${WASM_FILE}'\\)`));
  assert.doesNotMatch(patched, /#wasm-compiler-loader/);
});

test("injects a CompiledWasm import on the Worker entry", () => {
  const worker = injectWorkerWasmImport("export default { fetch() {} }\n");
  assert.match(worker, /import __PRISMA_QUERY_COMPILER_WASM from "\.\/prisma-wasm\/query_compiler_bg\.wasm"/);
  assert.equal(injectWorkerWasmImport(worker), worker);
});

test("copies wasm next to the OpenNext worker and rewrites handler imports", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "prisma-cf-wasm-"));
  const clientDir = path.join(root, "node_modules/.prisma/client");
  mkdirSync(clientDir, { recursive: true });
  writeFileSync(path.join(clientDir, WASM_FILE), Buffer.alloc(60_000, 1));

  const openNextDir = path.join(root, ".open-next");
  const handlerDir = path.join(openNextDir, "server-functions/default");
  mkdirSync(handlerDir, { recursive: true });
  writeFileSync(
    path.join(openNextDir, "worker.js"),
    'export default { fetch() { return new Response("ok"); } }\n',
  );
  writeFileSync(
    path.join(handlerDir, "handler.mjs"),
    `const wasm = await import("/bundle/node_modules/.prisma/client/${WASM_FILE}");\nexport const handler = wasm;\n`,
  );

  const dest = wireOpenNextPrismaWasm(root, openNextDir);
  const info = assertOpenNextHasPrismaWasm(openNextDir);
  assert.equal(info.bytes, 60_000);
  assert.equal(dest, path.join(openNextDir, "prisma-wasm", WASM_FILE));
  const handler = readFileSync(path.join(handlerDir, "handler.mjs"), "utf8");
  assert.match(handler, /\.\.\/\.\.\/prisma-wasm\/query_compiler_bg\.wasm/);
  assert.doesNotMatch(handler, /\/bundle\/node_modules/);
});
