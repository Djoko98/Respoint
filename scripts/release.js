import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function logStep(message) {
	console.log(message);
}

function readJson(filePath) {
	const raw = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(raw);
}

function writeJson(filePath, data) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function sha256OfFile(filePath) {
	return await new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha256');
		const stream = fs.createReadStream(filePath);
		stream.on('data', (chunk) => hash.update(chunk));
		stream.on('error', (err) => reject(err));
		stream.on('end', () => resolve(hash.digest('hex')));
	});
}

function findLatestInstaller() {
	const candidates = [];
	const base = path.join(projectRoot, 'src-tauri', 'target', 'release', 'bundle');
	const dirs = [
		path.join(base, 'nsis'),
		path.join(base, 'msi'),
		base,
	];
	for (const dir of dirs) {
		if (!fs.existsSync(dir)) continue;
		const files = fs.readdirSync(dir);
		for (const f of files) {
			const lower = f.toLowerCase();
			if (lower.endsWith('.exe') || lower.endsWith('.msi')) {
				const full = path.join(dir, f);
				const stat = fs.statSync(full);
				if (stat.isFile()) {
					candidates.push({ full, mtimeMs: stat.mtimeMs });
				}
			}
		}
	}
	if (candidates.length === 0) {
		throw new Error('Installer not found. Looked in nsis/msi/bundle folders.');
	}
	candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
	return candidates[0].full;
}

function runTauriBuild() {
	logStep('Running Tauri build...');
	// Use the exact command requested: `npm run tauri build`
	// Using shell for cross-platform argument passing
	execSync('npm run tauri build', { stdio: 'inherit', shell: true });
	logStep('Build finished ✔');
}

function signWithMinisign(targetFile, signatureOutFile) {
	const keyPath = path.join(os.homedir(), '.tauri', 'key.prv');
	if (!fs.existsSync(keyPath)) {
		throw new Error(`Private key not found at ${keyPath}`);
	}
	// minisign will create signature at signatureOutFile
	// -S sign, -m message-file, -s secret key, -x signature file path
	const cmd = `minisign -Sm "${targetFile}" -s "${keyPath}" -x "${signatureOutFile}"`;
	execSync(cmd, { stdio: 'inherit', shell: true });
	if (!fs.existsSync(signatureOutFile)) {
		throw new Error('Signature file was not created by minisign.');
	}
	logStep('Signature generated ✔');
}

/**
 * Bump patch version (x.y.z -> x.y.(z+1)).
 * Throws if the version is not a valid SemVer-like string.
 */
function bumpPatchVersion(current) {
	if (typeof current !== 'string') {
		throw new Error(`Invalid version in tauri.conf.json (expected string, got ${typeof current})`);
	}
	const parts = current.split('.');
	if (parts.length !== 3 || parts.some((p) => Number.isNaN(Number(p)))) {
		throw new Error(`Invalid version format in tauri.conf.json: "${current}" (expected x.y.z)`);
	}
	const [major, minor, patch] = parts.map((p) => Number(p));
	const next = `${major}.${minor}.${patch + 1}`;
	return next;
}

async function main() {
	const distReleaseDir = path.join(projectRoot, 'dist-release');
	ensureDir(distReleaseDir);

	// Read + bump version in tauri.conf.json BEFORE the build
	const tauriConfPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
	let tauriConf;
	try {
		tauriConf = readJson(tauriConfPath);
	} catch (err) {
		throw new Error(`Failed to read src-tauri/tauri.conf.json: ${err.message || err}`);
	}
	const currentVersion = tauriConf?.version;
	if (!currentVersion) {
		throw new Error('Version not found in src-tauri/tauri.conf.json');
	}

	const newVersion = bumpPatchVersion(currentVersion);
	tauriConf.version = newVersion;

	try {
		writeJson(tauriConfPath, tauriConf);
	} catch (err) {
		throw new Error(`Failed to write updated version to src-tauri/tauri.conf.json: ${err.message || err}`);
	}

	logStep(`✔ Version bumped to ${newVersion}`);

	// Try to stage & commit the version bump so it is included before pushing
	try {
		execSync(`git add "${tauriConfPath.replace(/\\/g, '/')}"`, { stdio: 'inherit', shell: true });
		execSync(`git commit -m "chore: bump Tauri version to v${newVersion}"`, { stdio: 'inherit', shell: true });
		logStep('Git commit created for Tauri version bump ✔');
	} catch (gitErr) {
		// Do not hard-fail the release if git is not available or commit fails;
		// just warn so the user can commit manually.
		console.warn('Warning: failed to create git commit for Tauri version bump:', gitErr.message || gitErr);
	}

	// 1) Build
	runTauriBuild();

	// 2) Locate installer
	const installerPath = findLatestInstaller();
	const installerName = path.basename(installerPath);
	logStep(`Installer located ✔ (${installerName})`);

	// 2.1) Copy installer into dist-release
	const destInstallerPath = path.join(distReleaseDir, installerName);
	fs.copyFileSync(installerPath, destInstallerPath);

	// 3) Compute SHA256
	const sha256 = await sha256OfFile(destInstallerPath);
	logStep(`SHA256 computed ✔ (${sha256})`);

	// 5) Sign with minisign (always use ~/.tauri/key.prv)
	const signatureFile = path.join(distReleaseDir, `${installerName}.minisig`);
	signWithMinisign(destInstallerPath, signatureFile);

	// 6) Read signature and base64-encode full file contents
	const sigContent = fs.readFileSync(signatureFile);
	const signatureB64 = Buffer.from(sigContent).toString('base64');

	// 4) Generate latest.json
	const latest = {
		version: newVersion,
		notes: "Auto-generated release",
		pub_date: new Date().toISOString(),
		platforms: {
			"windows-x86_64": {
				signature: signatureB64,
				url: `https://github.com/Djoko98/Respoint/releases/latest/download/${installerName}`
			}
		}
	};
	const latestJsonPath = path.join(distReleaseDir, 'latest.json');
	writeJson(latestJsonPath, latest);
	logStep('latest.json created ✔');

	// 7) Files saved to dist-release
	logStep('Files saved to dist-release ✔');
	console.log('');
	console.log('UPLOAD THESE FILES TO YOUR GITHUB RELEASE:');
	console.log(`- ${path.relative(projectRoot, latestJsonPath)}`);
	console.log(`- ${path.relative(projectRoot, destInstallerPath)}`);
	console.log('');
}

main().catch((err) => {
	console.error('Release failed:', err.message || err);
	process.exit(1);
});


