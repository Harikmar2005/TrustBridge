import { Router } from 'express';
import {
  fraudBenchmark,
  translationsTest,
  demoReset,
} from '../controllers/testController';

const router = Router();

router.get('/fraud-detection-benchmark', fraudBenchmark);
router.get('/translations', translationsTest);
router.post('/demo/reset', demoReset);

export default router;
