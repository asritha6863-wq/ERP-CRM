import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  toggleUser,
} from '../controllers/users.controller.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/',       listUsers);
router.get('/:id',    getUser);
router.post('/',      createUser);
router.put('/:id',    updateUser);
router.patch('/:id/toggle', toggleUser);

export default router;
