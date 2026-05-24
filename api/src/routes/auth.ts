import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/client';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/auth/login
  app.post(
    '/auth/login',
    async (req: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parsed.error.flatten(),
        });
      }

      const { email, password } = parsed.data;
      const pool = getPool();

      let user: UserRow | undefined;
      try {
        const { rows } = await pool.query<UserRow>(
          'SELECT id, email, password_hash, role FROM users WHERE email = $1',
          [email]
        );
        user = rows[0];
      } catch (err) {
        app.log.error(err, 'Failed to query user');
        return reply.status(500).send({ error: 'Internal server error' });
      }

      if (!user) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      const payload = { sub: user.id, email: user.email, role: user.role };
      const token = jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      });

      return reply.send({
        token,
        user: { id: user.id, email: user.email, role: user.role },
      });
    }
  );

  // GET /api/auth/me
  app.get(
    '/auth/me',
    { preHandler: requireAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return reply.send(req.user);
    }
  );
}
