import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import nexconnRoutes from './nexconnRoutes';
import conversationRoutes from './conversationRoutes';
import disputeRoutes from './disputeRoutes';
import supportRoutes from './supportRoutes';
import adminRoutes from './adminRoutes';
import fraudRoutes from './fraudRoutes';
import testRoutes from './testRoutes';
import { demoReset } from '../controllers/testController';

export const apiRouter = Router();

// Subroutes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);

// Support both /api/nexconn and /api/v1/nexconn
apiRouter.use('/nexconn', nexconnRoutes);
apiRouter.use('/v1/nexconn', nexconnRoutes);

// Conversations & Messages
apiRouter.use('/', conversationRoutes);

// Disputes
apiRouter.use('/disputes', disputeRoutes);

// Support, tickets, alerts, audit logs
apiRouter.use('/', supportRoutes);

// Admin metrics
apiRouter.use('/admin', adminRoutes);

// AI Fraud 2.0 endpoints
apiRouter.use('/v1/fraud', fraudRoutes);

// Test & Benchmark endpoints
apiRouter.use('/test', testRoutes);

// Demo scenario reset
apiRouter.post('/demo/reset', demoReset);
