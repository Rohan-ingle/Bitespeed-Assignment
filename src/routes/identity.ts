import { Router } from 'express';

const router = Router();

router.post('/identify', (req, res) => {
  // placeholder line 
  res.json({ message: 'Identity reconciliation endpoint' });
});

export default router;
