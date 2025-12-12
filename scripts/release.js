import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const OWNER = "Djoko98";
const REPO = "Respoint";

// Load GitHub token
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("❌ ERROR: GITHUB_TOKEN is not set!");
  process.exit(1);
}

function apiRequest(method, apiPath, body = null) {
  const data = body ? JSON.stringify(body) : null;

  const options = {
    hostname: "api.github.com",
    port: 443,
    path: apiPath,
    method,
    headers: {
      "User-Agent": "ResPoint-Release-Script",
      "Authorization": `token ${TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(body && { "Content-Length": Buffer.byteLength(data) })
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let response = "";
      res.on("data", (chunk) => (response += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(response));
        } catch (e) {
          resolve(response);
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function bumpVersion() {
  const tauriPath = path.join(projectRoot, "src-tauri", "tauri.conf.json");
  const conf = JSON.parse(fs.readFileSync(tauriPath));

  const [major, minor, patch] = conf.version.split(".").map(Number);
  const newVersion = `${major}.${minor}.${patch + 1}`;

  conf.version = newVersion;
  fs.writeFileSync(tauriPath, JSON.stringify(conf, null, 2));

  try {
    execSync(`git add "${tauriPath}"`);
    execSync(`git commit -m "chore: bump version to v${newVersion}"`);
  } catch (err) {
    console.warn("⚠️ Git error while committing version bump (continuing):", err.message);
  }

  return newVersion;
}

function setupTauriSigningKey() {
  // Check for Tauri signer key in .tauri directory
  // Note: `tauri signer generate -w .tauri/private` creates:
  //   - .tauri/private      (private key)
  //   - .tauri/private.key  (public key)
  const tauriKeyPath = path.join(projectRoot, ".tauri", "private");
  const altKeyPath = path.join(projectRoot, ".tauri", "private.key");

  let keyPath = null;

  if (fs.existsSync(tauriKeyPath)) {
    keyPath = tauriKeyPath;
    console.log("🔑 Found Tauri signer private key in .tauri/private");
  } else if (fs.existsSync(altKeyPath)) {
    // Some setups might put the private key in private.key – support it as fallback
    keyPath = altKeyPath;
    console.log("🔑 Found Tauri signer private key in .tauri/private.key");
  } else {
    console.error("❌ ERROR: No Tauri signer private key found!");
    console.error("   Expected locations:");
    console.error(`   - ${tauriKeyPath}`);
    console.error(`   - ${altKeyPath}`);
    console.error("\n   Generate a new key with:");
    console.error("     npx tauri signer generate -w .tauri/private");
    process.exit(1);
  }

  // Only path is needed for `tauri signer sign`
  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || "";
  console.log(`   Using key: ${keyPath}`);
  console.log(`   Password: ${password ? "SET" : "EMPTY"}`);

  return { keyPath, password };
}

function runBuild() {
  console.log("🔨 Running Tauri build (unsigned bundles)...");
  console.log("   (We will sign the installer afterwards with `tauri signer sign`) \n");

  execSync("npm run tauri build", {
    stdio: "inherit",
    env: process.env
  });
}

function signWithTauriSigner(installerPath, keyPath, password) {
  console.log("\n✍️  Signing installer with `tauri signer sign`...");

  // Build command:
  // npx tauri signer sign -f "<keyPath>" -p "<password>" "<installerPath>"
  const args = [
    "tauri",
    "signer",
    "sign",
    "-f",
    `"${keyPath}"`,
  ];

  if (password) {
    args.push("-p");
    args.push(`"${password}"`);
  }

  args.push(`"${installerPath}"`);

  const cmd = `npx ${args.join(" ")}`;
  console.log(`   Running: ${cmd}`);

  execSync(cmd, {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env
  });

  console.log("   ✅ Signing complete.");
}

function findInstallerAndSignature(keyPath, password) {
  const nsisDir = path.join(projectRoot, "src-tauri", "target", "release", "bundle", "nsis");

  if (!fs.existsSync(nsisDir)) {
    throw new Error(`NSIS output directory not found: ${nsisDir}`);
  }

  console.log("\n📂 Checking NSIS bundle directory...");
  const allFiles = fs.readdirSync(nsisDir);
  console.log("   Files found:", allFiles.join(", "));

  // Find the installer (.exe but not .exe.sig)
  const exeFiles = allFiles.filter((f) => f.endsWith(".exe") && !f.includes(".sig"));
  if (exeFiles.length === 0) {
    throw new Error(`No NSIS installer (.exe) found in: ${nsisDir}`);
  }

  // Sort by modification time (newest first)
  exeFiles.sort((a, b) => {
    return fs.statSync(path.join(nsisDir, b)).mtimeMs - fs.statSync(path.join(nsisDir, a)).mtimeMs;
  });

  const installerName = exeFiles[0];
  const installerPath = path.join(nsisDir, installerName);

  // Expected .sig path
  const sigPath = `${installerPath}.sig`;

  // If .sig doesn't exist yet, sign now with Tauri signer
  if (!fs.existsSync(sigPath)) {
    console.log("   No .sig file found, invoking `tauri signer sign`...");
    signWithTauriSigner(installerPath, keyPath, password);
  }

  if (!fs.existsSync(sigPath)) {
    console.error("\n❌ ERROR: .sig file still not found after signing!");
    console.error(`   Expected: ${sigPath}`);
    console.error("\n   Files in directory:");
    allFiles.forEach(f => console.error(`   - ${f}`));
    throw new Error(".sig file not generated by tauri signer");
  }

  console.log(`✅ Found installer: ${installerName}`);
  console.log(`✅ Found signature: ${installerName}.sig`);

  // Read the .sig file - it should contain only base64 signature
  const signature = fs.readFileSync(sigPath, "utf8").trim();
  
  // Validate signature format
  if (signature.includes("\n") || signature.includes("comment")) {
    console.warn("⚠️ WARNING: .sig file contains multiple lines or comments!");
    console.warn("   Expected: single line Base64 string");
  }
  
  console.log(`📝 Signature preview: ${signature.substring(0, 50)}...`);
  console.log(`📝 Signature length: ${signature.length} characters`);

  return { installerPath, installerName, signature, sigPath };
}

async function uploadAsset(uploadUrl, filePath) {
  const fileData = fs.readFileSync(filePath);
  const url = uploadUrl.split("{")[0] + "?name=" + path.basename(filePath);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "User-Agent": "ResPoint-Release",
          "Authorization": `token ${TOKEN}`,
          "Content-Type": "application/octet-stream",
          "Content-Length": fileData.length
        }
      },
      (res) => {
        let response = "";
        res.on("data", (c) => (response += c));
        res.on("end", () => resolve(JSON.parse(response)));
      }
    );

    req.on("error", reject);
    req.write(fileData);
    req.end();
  });
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║        ResPoint Release Script (Tauri Signer)         ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Step 1: Setup Tauri signing key (path + password)
  console.log("📌 Step 1: Setting up Tauri signing key...");
  const { keyPath, password } = setupTauriSigningKey();

  // Step 2: Bump version in tauri.conf.json
  console.log("\n📌 Step 2: Bumping version...");
  const version = bumpVersion();
  console.log(`   New version: v${version}`);

  // Step 3: Build with Tauri (unsigned)
  console.log("\n📌 Step 3: Building Tauri application...");
  runBuild();

  // Step 4: Find installer and .sig file
  console.log("\n📌 Step 4: Locating installer and signature...");
  const { installerPath, installerName, signature, sigPath } = findInstallerAndSignature(keyPath, password);

  // Step 5: Copy to dist-release
  console.log("\n📌 Step 5: Copying files to dist-release...");
  const distDir = path.join(projectRoot, "dist-release");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const distInstallerPath = path.join(distDir, installerName);
  const distSigPath = path.join(distDir, `${installerName}.sig`);

  fs.copyFileSync(installerPath, distInstallerPath);
  fs.copyFileSync(sigPath, distSigPath);
  console.log(`   ✅ Copied: ${installerName}`);
  console.log(`   ✅ Copied: ${installerName}.sig`);

  // Also keep a stable file name for custom bootstrap installers
  const stableInstallerName = "ResPoint_nsis_installer.exe";
  const stableInstallerPath = path.join(distDir, stableInstallerName);
  const stableSigPath = path.join(distDir, `${stableInstallerName}.sig`);

  fs.copyFileSync(installerPath, stableInstallerPath);
  fs.copyFileSync(sigPath, stableSigPath);
  console.log(`   ✅ Copied (stable): ${stableInstallerName}`);
  console.log(`   ✅ Copied (stable): ${stableInstallerName}.sig`);

  // Step 6: Create latest.json
  console.log("\n📌 Step 6: Creating latest.json...");
  const latest = {
    version,
    notes: "Automatic Release",
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature,
        url: `https://github.com/${OWNER}/${REPO}/releases/download/v${version}/${installerName}`
      }
    }
  };

  const latestPath = path.join(projectRoot, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2));
  console.log("   ✅ latest.json created");
  console.log(`   Signature in JSON: ${signature.substring(0, 40)}...`);

  // Step 7: Git commit and push
  console.log("\n📌 Step 7: Committing and pushing to GitHub...");
  try {
    execSync(`git add latest.json`);
    execSync(`git commit -m "update latest.json for v${version}"`);
    execSync("git push");
    console.log("   ✅ Pushed latest.json to GitHub");
  } catch (err) {
    console.warn("   ⚠️ Git warning:", err.message);
  }

  // Step 8: Create Git tag
  console.log("\n📌 Step 8: Creating Git tag...");
  let sha = null;
  try {
    sha = execSync("git rev-parse HEAD").toString().trim();
    await apiRequest("POST", `/repos/${OWNER}/${REPO}/git/refs`, {
      ref: `refs/tags/v${version}`,
      sha
    });
    console.log(`   ✅ Created tag: v${version}`);
  } catch (err) {
    console.warn("   ⚠️ Tag warning:", err.message);
  }

  // Step 9: Create GitHub Release
  console.log("\n📌 Step 9: Creating GitHub Release...");
  const release = await apiRequest("POST", `/repos/${OWNER}/${REPO}/releases`, {
    tag_name: `v${version}`,
    name: `v${version}`,
    body: `## ResPoint v${version}\n\nAutomatic release with signed installer.`,
    draft: false,
    prerelease: false
  });
  console.log(`   ✅ Release created: v${version}`);

  // Step 10: Upload assets
  console.log("\n📌 Step 10: Uploading release assets...");
  await uploadAsset(release.upload_url, installerPath);
  console.log(`   ✅ Uploaded: ${installerName}`);
  
  await uploadAsset(release.upload_url, latestPath);
  console.log("   ✅ Uploaded: latest.json");

  // Done!
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║              🎉 Release Complete! 🎉                   ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`
📋 Release Summary:
   Version:    v${version}
   Installer:  ${installerName}
   Signature:  ${signature.substring(0, 30)}...
   
🔗 Links:
   Release:    https://github.com/${OWNER}/${REPO}/releases/tag/v${version}
   latest.json: https://raw.githubusercontent.com/${OWNER}/${REPO}/main/latest.json
`);
}

main().catch(err => {
  console.error("\n❌ RELEASE FAILED:", err.message);
  process.exit(1);
});
