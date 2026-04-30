import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { prismaPlugin } from './plugins/prisma.js';
import { sessionPlugin } from './plugins/session.js';
import { errorHandler } from './utils/errors.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import workshopRoutes from './routes/workshops.js';
import orderRoutes from './routes/orders.js';
import chatRoute from './routes/chat.js';
import adminUserRoutes from './routes/admin/users.js';
import adminProductRoutes from './routes/admin/products.js';
import adminOrderRoutes from './routes/admin/orders.js';
import adminStatsRoutes from './routes/admin/stats.js';

const isProd = process.env.NODE_ENV === 'production';

const app = Fastify({
  logger: { level: isProd ? 'warn' : 'info' },
  trustProxy: true,
});

// Security headers
await app.register(fastifyHelmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
});

// CORS — same-origin in Docker (nginx handles it), explicit origins for local dev
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost').split(',').map(s => s.trim());
await app.register(fastifyCors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
});

// Cookie parser (needed for session cookie reading)
await app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'craftory-dev-change-this-in-production-use-32-char-random-string',
});

// Database via Prisma
await app.register(prismaPlugin);

// Postgres-backed session layer
await app.register(sessionPlugin);

// Rate limiting (global defaults, routes can override)
await app.register(fastifyRateLimit, {
  max: 120,
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    const fwd = req.headers['x-forwarded-for'];
    return fwd ? fwd.split(',')[0].trim() : req.ip;
  },
  errorResponseBuilder: () => ({ message: 'Quá nhiều yêu cầu. Thử lại sau 1 phút.' }),
});

// Health check
app.get('/api/v1/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
}));

// API Routes
await app.register(authRoutes,         { prefix: '/api/v1/auth'  });
await app.register(productRoutes,      { prefix: '/api/v1'       });
await app.register(workshopRoutes,     { prefix: '/api/v1'       });
await app.register(orderRoutes,        { prefix: '/api/v1'       });
await app.register(chatRoute,          { prefix: '/api/v1'       });
await app.register(adminUserRoutes,    { prefix: '/api/v1/admin' });
await app.register(adminProductRoutes, { prefix: '/api/v1/admin' });
await app.register(adminOrderRoutes,   { prefix: '/api/v1/admin' });
await app.register(adminStatsRoutes,   { prefix: '/api/v1/admin' });

app.setErrorHandler(errorHandler);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
await app.listen({ port: PORT, host: HOST });
console.log(`🚀 Craftory backend · http://${HOST}:${PORT}`);
