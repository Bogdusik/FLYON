import multer from 'multer';

/**
 * Multer configuration for file uploads
 */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
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
