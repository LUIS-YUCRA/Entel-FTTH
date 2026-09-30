const express = require('express');
const multer = require('multer');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/AuthMiddleware');

const {
  validateLogin, validateRegister
} = require('../middleware/ValidationMiddleware');

const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => callback(
    null,
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype),
  ),
});

router.post('/login',
   validateLogin, authController.login
);

router.post( '/register',
  validateRegister, authController.register
);

router.post('/refresh-token',
  authController.refreshToken
);

router.get('/profile',
  authenticate,  authController.getProfile
);

router.patch('/profile',
  authenticate, authController.updateProfile
);

router.get('/profile/photo',
  authenticate, authController.getProfilePhoto
);
router.get('/users/:id/photo', authenticate, authController.getUserProfilePhoto);

router.post('/profile/photo',
  authenticate, profilePhotoUpload.single('photo'), authController.uploadProfilePhoto
);

router.post('/activity', authenticate, authController.activity);

router.post('/logout',
  authenticate,  authController.logout
);

module.exports = router;
