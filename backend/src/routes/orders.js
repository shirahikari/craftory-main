import { z } from 'zod';
import { AppError } from '../utils/errors.js';
import { requireAuth, requireCsrf } from '../middleware/rbac.js';

// Build the payment-instruction payload for an order. Returns null in dev when
// SePay isn't configured, so the existing flow still works without payments.
function buildPaymentInfo(order) {
  const acc = process.env.SEPAY_ACCOUNT_NUMBER;
  const bank = process.env.SEPAY_BANK_CODE;
  const name = process.env.SEPAY_ACCOUNT_NAME;
  if (!acc || !bank) return null;
  const memo = 'CRAFTORY' + order.id.slice(-8).toUpperCase();
  const qrUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(acc)}&bank=${encodeURIComponent(bank)}&amount=${order.total}&des=${encodeURIComponent(memo)}`;
  return {
    qrUrl,
    bankCode: bank,
    accountNumber: acc,
    accountName: name || '',
    memo,
    amount: order.total,
  };
}

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(99),
});

const noHtml = (label) => z.string().refine(
  s => !/[<>]/.test(s),
  { message: `${label} không được chứa ký tự < hoặc >.` }
);

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Giỏ hàng trống.').max(50, 'Giỏ hàng không được vượt quá 50 sản phẩm.'),
  shippingName: noHtml('Tên người nhận').and(z.string().min(2, 'Tên người nhận không hợp lệ.').max(100)),
  shippingPhone: z.string().regex(/^[0-9]{9,11}$/, 'Số điện thoại không hợp lệ.'),
  shippingAddress: noHtml('Địa chỉ').and(z.string().min(10, 'Địa chỉ không hợp lệ.').max(500)),
  note: noHtml('Ghi chú').and(z.string().max(500)).optional(),
});

export default async function orderRoutes(fastify) {
  // POST /api/v1/orders
  fastify.post('/orders', {
    preHandler: [requireAuth, requireCsrf],
    bodyLimit: 65536, // 64 KB — well above legitimate 50-item payload, blocks bulk-row attacks
  }, async (req, reply) => {
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
    return { order, payment: buildPaymentInfo(order) };
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
    // Show payment info while still pending; once paid the customer doesn't need it.
    const payment = order.status === 'pending' ? buildPaymentInfo(order) : null;
    return { order, payment };
  });
}
