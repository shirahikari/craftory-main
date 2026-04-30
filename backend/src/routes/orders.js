import { z } from 'zod';
import { AppError } from '../utils/errors.js';
import { requireAuth, requireCsrf } from '../middleware/rbac.js';

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(99),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Giỏ hàng trống.').max(50, 'Giỏ hàng không được vượt quá 50 sản phẩm.'),
  shippingName: z.string().min(2, 'Tên người nhận không hợp lệ.').max(100),
  shippingPhone: z.string().regex(/^[0-9]{9,11}$/, 'Số điện thoại không hợp lệ.'),
  shippingAddress: z.string().min(10, 'Địa chỉ không hợp lệ.').max(500),
  note: z.string().max(500).optional(),
});

export default async function orderRoutes(fastify) {
  // POST /api/v1/orders
  fastify.post('/orders', { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.', 400);
    }

    const { items, shippingName, shippingPhone, shippingAddress, note } = parsed.data;

    // Verify all products exist and are published
    const productIds = items.map(i => i.productId);
    const products = await fastify.prisma.product.findMany({
      where: { id: { in: productIds }, status: 'published' },
      select: { id: true, price: true, name: true },
    });

    if (products.length !== productIds.length) {
      throw new AppError('Một số sản phẩm không tồn tại hoặc đã ngừng bán.', 400);
    }

    const productMap = new Map(products.map(p => [p.id, p]));
    let total = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(item.productId);
      const unitPrice = product.price;
      total += unitPrice * item.qty;
      return { productId: item.productId, qty: item.qty, unitPrice };
    });

    const order = await fastify.prisma.order.create({
      data: {
        userId: req.user.id,
        total,
        shippingName,
        shippingPhone,
        shippingAddress,
        note,
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, emoji: true } } } },
      },
    });

    reply.code(201);
    return { order };
  });

  // GET /api/v1/orders
  fastify.get('/orders', { preHandler: [requireAuth] }, async (req) => {
    const orders = await fastify.prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, emoji: true, images: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { orders };
  });

  // GET /api/v1/orders/:id
  fastify.get('/orders/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const order = await fastify.prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, emoji: true, images: true } } },
        },
      },
    });
    if (!order) return reply.code(404).send({ message: 'Không tìm thấy đơn hàng.' });
    return { order };
  });
}
