import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  checkIn, checkOut, cancelVisit, listVisits, getActiveVisit,
  pingLocation, listLiveLocations, getLocationHistory,
} from '../controllers/bdeField.controller.js';

const router = Router();
router.use(authenticate);

// Visits (field work with customer info)
router.get('/visits',            listVisits);
router.get('/visits/active',     getActiveVisit);
router.post('/visits/check-in',  checkIn);
router.put('/visits/:id/check-out', checkOut);
router.put('/visits/:id/cancel',    cancelVisit);

// Live GPS
router.post('/location/ping',           pingLocation);
router.get('/location/live',            listLiveLocations);
router.get('/location/history/:staffId', getLocationHistory);

export default router;
