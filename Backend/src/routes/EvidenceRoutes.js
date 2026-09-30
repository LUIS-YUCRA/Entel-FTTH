const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const controller = require('../controllers/EvidenceController');
const { authenticate } = require('../middleware/AuthMiddleware');

const uploadDirectory = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(file.mimetype);
    const error = allowed ? null : Object.assign(
      new Error('Solo se permiten imágenes JPEG, PNG, WEBP o videos MP4'),
      { status: 400 },
    );
    callback(error, allowed);
  },
});

const router = express.Router();
router.use(authenticate);
router.post('/', uploader.single('file'), controller.upload);
router.get('/:id/download', controller.download);

module.exports = router;
