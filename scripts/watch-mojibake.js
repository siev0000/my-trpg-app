#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { TextDecoder } = require("util");

const rootDir = process.cwd();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

const includeExtensions = new Set([
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".vue",
    ".css",
    ".html",
    ".json"
]);

const ignoreDirs = new Set([
    ".git",
    "node_modules",
    "dist",
    "public/bc"
]);

const ignoreFilePatterns = [
    /\.bak/i,
    /\.before_fix_mojibake/i,
    /\.recovered\.js$/i,
    /copy\.js$/i,
    /scripts\/check-mojibake\.js$/i,
    /scripts\/watch-mojibake\.js$/i
];

const mojibakeRegex = /(繝ｻ・ｽ|驛｢・ｧ|驍ｵ・ｺ|髣包ｽｳ|髯晢ｽｾ|鬯ｯ繝ｻ髮弱・・ｽ・ｦ|髯具ｽｹ|鬮｢・ｭ陟包ｽ｡繝ｻ・ｸ繝ｻ・ｭ|鬮ｯ・ｬ郢晢ｽｻ繝ｻ陌暮ｩ墓ｩｸ・ｽ・ｮ鬯ｯ繝ｻ|郢ｧ|陷ｷ|髢ｨ|鬯ｲ|隰ｾ|鬮ｦ|鬨ｾ|騾｡|陋ｻ|驕桍髫ｧ|\uFFFD)/g;

function normalizePath(p) {
    return p.replace(/\\/g, "/");
}

function shouldIgnoreDir(relPath) {
    const normalized = normalizePath(relPath);
    return [...ignoreDirs].some((d) => normalized === d || normalized.startsWith(`${d}/`));
}

function shouldIgnoreFile(relPath) {
    const normalized = normalizePath(relPath);
    if (shouldIgnoreDir(path.dirname(normalized))) return true;
    return ignoreFilePatterns.some((pattern) => pattern.test(normalized));
}

function isTargetFile(relPath) {
    const ext = path.extname(relPath).toLowerCase();
    return includeExtensions.has(ext);
}

function analyzeFile(fullPath) {
    if (!fs.existsSync(fullPath)) return null;
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return null;

    const relPath = normalizePath(path.relative(rootDir, fullPath));
    if (!relPath || relPath.startsWith("..")) return null;
    if (!isTargetFile(relPath)) return null;
    if (shouldIgnoreFile(relPath)) return null;

    const bytes = fs.readFileSync(fullPath);
    let text = "";

    try {
        text = utf8Decoder.decode(bytes);
    } catch (error) {
        return {
            path: relPath,
            reason: `Invalid UTF-8 (${error.message})`
        };
    }

    if (text.includes("\uFFFD")) {
        return {
            path: relPath,
            reason: "Contains replacement character (�)"
        };
    }

    const matches = text.match(mojibakeRegex) || [];
    if (matches.length > 0 && (text.includes("繝ｻ・ｽ") || matches.length >= 3)) {
        return {
            path: relPath,
            reason: `Detected mojibake patterns (${matches.length} hits)`
        };
    }

    return null;
}

function fail(issue) {
    console.error("\n[encoding-guard] SAVE BLOCKED");
    console.error(`[encoding-guard] file: ${issue.path}`);
    console.error(`[encoding-guard] reason: ${issue.reason}`);
    console.error("[encoding-guard] fix the file encoding to UTF-8 and retry.");
    process.exit(1);
}

function walkAndCheck(dir, rel = "") {
    if (rel && shouldIgnoreDir(rel)) return;

    const fullDir = path.join(dir, rel);
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
        const entryRel = path.join(rel, entry.name);
        if (entry.isDirectory()) {
            walkAndCheck(dir, entryRel);
            continue;
        }
        const issue = analyzeFile(path.join(dir, entryRel));
        if (issue) fail(issue);
    }
}

function main() {
    walkAndCheck(rootDir);
    console.log("[encoding-guard] watching for mojibake/encoding issues...");

    const debounceMap = new Map();
    fs.watch(rootDir, { recursive: true }, (eventType, fileName) => {
        if (!fileName) return;
        const fullPath = path.join(rootDir, fileName);
        const key = normalizePath(fullPath);

        if (debounceMap.has(key)) clearTimeout(debounceMap.get(key));
        const timer = setTimeout(() => {
            debounceMap.delete(key);
            const issue = analyzeFile(fullPath);
            if (issue) fail(issue);
        }, 80);
        debounceMap.set(key, timer);
    });
}

main();

