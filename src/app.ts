import express from 'express';
import identityRoutes from './routes/identity';

const app = express();
app.use(express.json());

app.use('/api', identityRoutes);

export default app;
