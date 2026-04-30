import { z } from 'zod';
import { AppError } from '../../utils/errors.js';
import { requireEmployee, requireCsrf } from '../../middleware/rbac.js';

const productSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10),
  price: z.number().int().positive(),
  oldPrice: z.number().int().positive().nullable().optional(),
  category: z.enum(['kit', 'book']),
  ageRange: z.string().min(2).max(50),
  collection: z.string().min(2).max(100),
  emoji: z.string().optional().default('🎨'),
  badge: z.enum(['hot', 'new', 'sale']).nullable().optional(),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#FEF5EA'),
  includes: z.array(z.string()).optional().default([]),
  images: z.array(z.string().url()).optional().default([]),
  status: z.enum(['published', 'draft', 'archived']).optional().default('published'),
});

const updateProductSchema = productSchema.partial();

export default async function adminProductRoutes(fastify) {
  const auth = [requireEmployee, requireCsrf];

  // GET /api/v1/admin/products
  fastify.get('/products', { preHandler: [requireEmployee] }, async (req) => {
    const { status } = req.query;
    const where = status ? { status } : {};
    const products = await fastify.prisma.product.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    return { products };
  });

  // POST /api/v1/admin/products
  fastify.post('/products', { preHandler: auth }, async (req, reply) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.', 400);
    }

    const product = await fastify.prisma.product.create({ data: parsed.data });
    reply.code(201);
    return { product };
  });

  // PUT /api/v1/admin/products/:id
  fastify.put('/products/:id', { preHandler: auth }, async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.code(400).send({ message: 'ID không hợp lệ.' });

    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.', 400);
    }

    const existing = await fastify.prisma.product.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'Không tìm thấy sản phẩm.' });

    const product = await fastify.prisma.product.update({ where: { id }, data: parsed.data });
    return { product };
  });

  // DELETE /api/v1/admin/products/:id
  fastify.delete('/products/:id', { preHandler: auth }, async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.code(400).send({ message: 'ID không hợp lệ.' });

    const existing = await fastify.prisma.product.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'Không tìm thấy sản phẩm.' });

    // Archive instead of delete if there are orders
    const hasOrders = await fastify.prisma.orderItem.findFirst({ where: { productId: id } });
    if (hasOrders) {
      await fastify.prisma.product.update({ where: { id }, data: { status: 'archived' } });
      return { message: 'Sản phẩm đã được lưu trữ (có đơn hàng liên quan).' };
    }

    await fastify.prisma.product.delete({ where: { id } });
    return { message: 'Đã xóa sản phẩm.' };
  });
}
