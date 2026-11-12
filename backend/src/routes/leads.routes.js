import { Router }    from 'express';
import multer        from 'multer';
import { authenticate }  from '../middleware/auth.middleware.js';
import {
  list, getOne, create, update, bulkAssign, convert,
  win, lose,
  getActivities, postActivity, importFile,
} from '../controllers/leads.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.get('/',                        list);
router.get('/:id',                     getOne);
router.post('/',                       create);
router.put('/:id',                     update);
router.post('/bulk-assign',            bulkAssign);
router.post('/:id/convert',            convert);
router.post('/:id/win',                win);
router.post('/:id/lose',               lose);
router.get('/:id/activities',          getActivities);
router.post('/:id/activities',         postActivity);
router.post('/import', upload.single('file'), importFile);

export default router;
