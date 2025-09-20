// Slightly zooms in the app icon to appear larger in taskbar.
// - Backs up original icon to icon.source.png
// - Produces optimized icon.png at 1024x1024 with ~15% zoom-in

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ICONS_DIR = path.join(process.cwd(), 'src-tauri', 'icons');
const SOURCE_ICON = path.join(ICONS_DIR, 'icon.png');
const BACKUP_ICON = path.join(ICONS_DIR, 'icon.source.png');
const DEST_ICON = SOURCE_ICON; // overwrite icon.png

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const exists = await fileExists(SOURCE_ICON);
  if (!exists) {
    throw new Error(`Source icon not found at ${SOURCE_ICON}`);
  }

  // Backup original icon
  try {
    await fs.copyFile(SOURCE_ICON, BACKUP_ICON);
  } catch {}

  // Zoom factor (default 1.15).
  // Priority: CLI arg -> env ICON_ZOOM -> default.
  const argZoom = process.argv[2];
  const zoom = Number(argZoom || process.env.ICON_ZOOM || '1.15');
  const target = 1024;
  const enlarged = Math.round(target * zoom);

  // Resize up and then crop center back to 1024x1024
  const buffer = await sharp(SOURCE_ICON)
    .resize({ width: enlarged, height: enlarged, fit: 'cover', position: 'centre' })
    .toBuffer();

  const left = Math.max(0, Math.floor((enlarged - target) / 2));
  const top = Math.max(0, Math.floor((enlarged - target) / 2));

  await sharp(buffer)
    .extract({ left, top, width: target, height: target })
    .png({ compressionLevel: 9 })
    .toFile(DEST_ICON);

  console.log(`✅ Icon optimized with zoom=${zoom}. Output: ${DEST_ICON}`);
}

main().catch((err) => {
  console.error('❌ Failed to optimize icon:', err.message || err);
  process.exit(1);
});


