import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function ensureUploadsDir(): void {
  if (!fs.existsSync(config.uploads.dir)) {
    fs.mkdirSync(config.uploads.dir, { recursive: true });
  }
}

export async function saveUploadedFile(
  attachmentUrl: string,
  orderId: string
): Promise<string> {
  ensureUploadsDir();

  const urlPath = new URL(attachmentUrl).pathname;
  const ext = path.extname(urlPath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File type not allowed: ${ext}. Use jpg, jpeg, png, or webp.`);
  }

  const filename = `${orderId}_${uuidv4()}${ext}`;
  const filePath = path.join(config.uploads.dir, filename);

  const response = await fetch(attachmentUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filename;
}

export function isValidFilename(filename: string): boolean {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export function getFilePath(filename: string): string {
  return path.join(config.uploads.dir, filename);
}
