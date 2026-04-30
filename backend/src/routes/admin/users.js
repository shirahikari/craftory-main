import { z } from 'zod';
import { AppError } from '../../utils/errors.js';
import { requireAdmin, requireCsrf } from '../../middleware/rbac.js';

const updateUserSchema = z.object({
  role: z.enum(['customer', 'employee', 'admin']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  name: z.string().min(2).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Không có thay đổi nào.' });

async function logAudit(prisma, actorId, action, targetType, targetId, metadata) {
  await prisma.auditLog.create({
    data: { actorUserId: actorId, action, targetType, targetId, metadata },
  }).catch(() => {});
}

export default async function adminUserRoutes(fastify) {
  const auth = [requireAdmin, requireCsrf];

  // GET /api/v1/admin/users
  fastify.get('/users', { preHandler: [requireAdmin] }, async (req) => {
    const users = await fastify.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { users };
  });

  // PATCH /api/v1/admin/users/:id
  fastify.patch('/users/:id', { preHandler: auth }, async (req, reply) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.', 400);
    }

    const { id } = req.params;
    if (id === req.user.id && parsed.data.role && parsed.data.role !== 'admin') {
      throw new AppError('Không thể tự hạ quyền của mình.', 400);
    }

    const target = await fastify.prisma.user.findUnique({ where: { id } });
    if (!target) return reply.code(404).send({ message: 'Không tìm thấy người dùng.' });

    const updated = await fastify.prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    await logAudit(fastify.prisma, req.user.id, 'user.update', 'User', id, {
      changes: parsed.data,
      before: { role: target.role, status: target.status },
    });

    // Invalidate sessions if disabled
    if (parsed.data.status === 'disabled') {
      await fastify.prisma.session.deleteMany({ where: { userId: id } });
    }

    return { user: updated };
  });
}
