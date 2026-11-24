const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const engineSrcDir = path.join(rootDir, 'engine', 'src');
const webDir = path.join(rootDir, 'web');
const outDir = path.join(webDir, 'js');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Collect all C source files from engine/src
const cFiles = fs.readdirSync(engineSrcDir)
    .filter(file => file.endsWith('.c'))
    .map(file => path.join(engineSrcDir, file));

// Add the WASM entry point
cFiles.push(path.join(webDir, 'kuroba_wasm.c'));

// Locate emcc executable
let emccCmd = 'emcc';
const localEmsdk = path.join(process.env.USERPROFILE || '', 'emsdk', 'upstream', 'emscripten', 'emcc.exe');
if (fs.existsSync(localEmsdk)) {
    emccCmd = `"${localEmsdk}"`;
}

const outFile = path.join(outDir, 'kuroba-engine.js');
const includeDir = path.join(rootDir, 'engine', 'include');

const cmd = [
    emccCmd,
    `-I "${includeDir}"`,
    '-D_strdup=strdup',
    '-D_strtoi64=strtoll',
    '-DMAX_PATH=1024',
    cFiles.map(f => `"${f}"`).join(' '),
    '-O2',
    '-sWASM=1',
    '-sALLOW_MEMORY_GROWTH=1',
    '-sFORCE_FILESYSTEM=1',
    '-sEXPORTED_FUNCTIONS=_krb_wasm_init,_krb_wasm_run,_krb_wasm_reset,_malloc,_free',
    '-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,UTF8ToString,stringToUTF8,FS',
    `-o "${outFile}"`
].join(' ');

console.log('Compiling Kuroba C Engine to WebAssembly (WASM)...');
execSync(cmd, { stdio: 'inherit' });
console.log('WebAssembly build succeeded:', outFile);
