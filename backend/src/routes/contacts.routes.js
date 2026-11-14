import { Router }      from 'express';
import multer from 'multer';
import { importContactsFile } from '../controllers/import.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, getOne, create, update, remove, getLeads, getDeals } from '../controllers/contacts.controller.js';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
router.post('/import', upload.single('file'), importContactsFile);
router.get('/', list);
router.get('/:id',             getOne);
router.post('/',               create);
router.put('/:id',             update);
router.delete('/:id',          remove);
router.get('/:id/leads',       getLeads);
router.get('/:id/deals',       getDeals);

export default router;

