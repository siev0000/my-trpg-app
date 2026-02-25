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

function shouldIgnoreFile(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    return ignoreFilePatterns.some((pattern) => pattern.test(normalized));
}

function shouldIgnoreDir(dirPath) {
    const normalized = dirPath.replace(/\\/g, "/");
    return [...ignoreDirs].some((d) => normalized === d || normalized.startsWith(`${d}/`));
}

function walk(dir, rel = "") {
    const currentRel = rel.replace(/\\/g, "/");
    if (currentRel && shouldIgnoreDir(currentRel)) return [];

    const fullDir = path.join(dir, rel);
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });

    const files = [];
    for (const entry of entries) {
        const entryRel = path.join(rel, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(dir, entryRel));
            continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (!includeExtensions.has(ext)) continue;
        if (shouldIgnoreFile(entryRel)) continue;
        files.push(entryRel);
    }
    return files;
}

function collectHitLines(lines, predicate, max = 5) {
    const hitLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (predicate(lines[i])) {
            hitLines.push({ line: i + 1, text: lines[i].trim() });
        }
        if (hitLines.length >= max) break;
    }
    return hitLines;
}

function analyzeFile(relPath) {
    const fullPath = path.join(rootDir, relPath);
    const rawBytes = fs.readFileSync(fullPath);
    const issues = [];
    let rawText = "";

    try {
        rawText = utf8Decoder.decode(rawBytes);
    } catch (error) {
        issues.push({
            type: "invalid-utf8",
            count: 1,
            hitLines: [{ line: 1, text: `Invalid UTF-8 byte sequence (${error.message})` }]
        });
        return {
            path: relPath.replace(/\\/g, "/"),
            issues
        };
    }

    if (rawText.includes("\uFFFD")) {
        const lines = rawText.split(/\r?\n/);
        issues.push({
            type: "replacement-char",
            count: (rawText.match(/\uFFFD/g) || []).length,
            hitLines: collectHitLines(lines, (line) => line.includes("\uFFFD"))
        });
    }

    const matches = rawText.match(mojibakeRegex) || [];
    const strongSignal = rawText.includes("繝ｻ・ｽ") || matches.length >= 3;
    if (matches.length > 0 && strongSignal) {
        const lines = rawText.split(/\r?\n/);
        issues.push({
            type: "mojibake-pattern",
            count: matches.length,
            hitLines: collectHitLines(lines, (line) => {
                const matched = mojibakeRegex.test(line);
                mojibakeRegex.lastIndex = 0;
                return matched;
            })
        });
    }

    if (issues.length === 0) return null;

    return {
        path: relPath.replace(/\\/g, "/"),
        issues
    };
}

function main() {
    const files = walk(rootDir);
    const findings = [];

    for (const file of files) {
        const result = analyzeFile(file);
        if (result) findings.push(result);
    }

    if (findings.length === 0) {
        console.log("No mojibake/encoding issues found.");
        process.exit(0);
    }

    console.error("Potential mojibake/encoding issues detected:");
    for (const f of findings) {
        console.error(`- ${f.path}`);
        for (const issue of f.issues) {
            console.error(`  [${issue.type}] hits: ${issue.count}`);
            for (const hit of issue.hitLines) {
                console.error(`    L${hit.line}: ${hit.text}`);
            }
        }
    }
    process.exit(1);
}

main();
