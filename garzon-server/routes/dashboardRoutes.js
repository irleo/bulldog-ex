import { Router } from 'express';
import { authenticate } from '../middleware/authentication.js';
import { authorize } from '../middleware/authorization.js';
import { getDashboardMetrics, retryMediaCleanup } from '../controllers/dashboardController.js';
const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', getDashboardMetrics);
router.post('/media-cleanup/retry', retryMediaCleanup);
export default router;
