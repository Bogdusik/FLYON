import multer from 'multer';
import env from '../config/env';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: env.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV, JSON, and text files
    const allowedMimes = [
      'text/csv',
      'application/json',
      'text/plain',
      'application/octet-stream',
    ];
    
    const allowedExtensions = ['.csv', '.json', '.txt', '.log', '.bbl', '.bin'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});
