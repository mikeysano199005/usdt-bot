import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { isValidFilename, getFilePath } from '../../services/fileService';

const router = Router();

router.use(requireAuth);

router.get('/:filename', (req: AuthRequest, res: Response) => {
  const { filename } = req.params;

  if (!isValidFilename(filename)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = getFilePath(filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const ext = path.extname(filename).toLowerCase().slice(1);
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(path.resolve(filePath));
});

export default router;
