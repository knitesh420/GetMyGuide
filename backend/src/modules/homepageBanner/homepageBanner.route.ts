import express from 'express';
import { uploadHomepageBanner, getHomepageBanners } from './homepageBanner.controller';

const router = express.Router();

router.get('/', getHomepageBanners);
router.post('/upload-banner', uploadHomepageBanner);

export default router;
