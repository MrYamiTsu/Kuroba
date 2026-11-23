const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(pkgPath)) {
    console.error('Error: package.json not found at', pkgPath);
    process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;
const vVersion = 'v' + version;

console.log(`[sync-version] Using package.json as single source of truth: ${version} (${vVersion})`);

// 1. Synchronize config.json
const configPath = path.join(rootDir, 'config.json');
if (fs.existsSync(configPath)) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.version !== version) {
            config.version = version;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
            console.log(`  ✓ config.json -> ${version}`);
        } else {
            console.log(`  - config.json is already up to date (${version})`);
        }
    } catch (e) {
        console.error('Failed to update config.json:', e.message);
    }
}

// 2. Synchronize README.md version badge
const readmePath = path.join(rootDir, 'README.md');
if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, 'utf-8');
    const badgeRegex = /https:\/\/img\.shields\.io\/badge\/version-v[0-9.]+-blue\.svg/g;
    const newBadge = `https://img.shields.io/badge/version-${vVersion}-blue.svg`;
    if (readme.match(badgeRegex)) {
        readme = readme.replace(badgeRegex, newBadge);
        fs.writeFileSync(readmePath, readme, 'utf-8');
        console.log(`  ✓ README.md badge -> ${vVersion}`);
    }
}

// 3. Synchronize web/js/kuroba-web.js
const webRuntimePath = path.join(rootDir, 'web/js/kuroba-web.js');
if (fs.existsSync(webRuntimePath)) {
    let runtimeCode = fs.readFileSync(webRuntimePath, 'utf-8');
    let modified = false;

    // Header comment
    const headerRegex = /\* Kuroba — In-Browser Runtime Engine v[0-9.]+/g;
    if (runtimeCode.match(headerRegex)) {
        runtimeCode = runtimeCode.replace(headerRegex, `* Kuroba — In-Browser Runtime Engine ${vVersion}`);
        modified = true;
    }

    // Kuroba.version export
    const versionExportRegex = /version:\s*'[^']+'/g;
    if (runtimeCode.match(versionExportRegex)) {
        runtimeCode = runtimeCode.replace(versionExportRegex, `version: '${version}'`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(webRuntimePath, runtimeCode, 'utf-8');
        console.log(`  ✓ web/js/kuroba-web.js -> ${vVersion}`);
    }
}

// 4. Synchronize web/*.html version badges
const webDir = path.join(rootDir, 'web');
if (fs.existsSync(webDir)) {
    const htmlFiles = fs.readdirSync(webDir).filter(f => f.endsWith('.html'));
    for (const f of htmlFiles) {
        const filePath = path.join(webDir, f);
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;

        // Replace <span class="version-badge">vX.Y.Z</span>
        const badgeTagRegex = /<span class="version-badge">v[0-9.]+<\/span>/g;
        if (content.match(badgeTagRegex)) {
            content = content.replace(badgeTagRegex, `<span class="version-badge">${vVersion}</span>`);
            modified = true;
        }

        // Special replacements for updates.html & playground.html
        if (f === 'updates.html') {
            const statRegex = /<span class="roadmap-stat-value moss">v[0-9.]+<\/span>/g;
            if (content.match(statRegex)) {
                content = content.replace(statRegex, `<span class="roadmap-stat-value moss">${vVersion}</span>`);
                modified = true;
            }
            const footerVerRegex = /<div class="footer-version">Active Core: v[0-9.]+/g;
            if (content.match(footerVerRegex)) {
                content = content.replace(footerVerRegex, `<div class="footer-version">Active Core: ${vVersion}`);
                modified = true;
            }
        }

        if (f === 'playground.html') {
            const termSysRegex = /<div class="term-line sys">Kuroba \(KRB\) Web Runtime Engine v[0-9.]+<\/div>/g;
            if (content.match(termSysRegex)) {
                content = content.replace(termSysRegex, `<div class="term-line sys">Kuroba (KRB) Web Runtime Engine ${vVersion}</div>`);
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`  ✓ web/${f} -> ${vVersion}`);
        }
    }
}

console.log(`[sync-version] All version references are synchronized with package.json (${version})!`);
