import { requireAdmin } from '../../middleware/rbac.js';

export default async function adminStatsRoutes(fastify) {
  // GET /api/v1/admin/stats
  fastify.get('/stats', { preHandler: [requireAdmin] }, async () => {
    const now = new Date();
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalOrders,
      totalProducts,
      revenue7d,
      revenue30d,
      ordersByStatus,
      topProducts,
      newUsers7d,
      recentOrders,
    ] = await Promise.all([
      fastify.prisma.user.count(),
      fastify.prisma.order.count(),
      fastify.prisma.product.count({ where: { status: 'published' } }),

      fastify.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: day7 }, status: { notIn: ['cancelled'] } },
      }),

      fastify.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: day30 }, status: { notIn: ['cancelled'] } },
      }),

      fastify.prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      fastify.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { qty: true, unitPrice: true },
        orderBy: { _sum: { qty: 'desc' } },
        take: 5,
      }),

      fastify.prisma.user.count({ where: { createdAt: { gte: day7 } } }),

      fastify.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
    ]);

    // Enrich top products with names
    const productIds = topProducts.map(t => t.productId);
    const products = await fastify.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, emoji: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    const topProductsEnriched = topProducts.map(t => ({
      product: productMap.get(t.productId),
      totalQty: t._sum.qty,
      totalRevenue: (t._sum.qty || 0) * (t._sum.unitPrice || 0),
    }));

    // Revenue by day (last 7 days)
    const revenueByDay = await fastify.prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(total), 0)::int as revenue,
        COUNT(*)::int as orders
      FROM "Order"
      WHERE created_at >= ${day7} AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return {
      totals: {
        users: totalUsers,
        orders: totalOrders,
        products: totalProducts,
        revenue7d: revenue7d._sum.total || 0,
        revenue30d: revenue30d._sum.total || 0,
        newUsers7d,
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      topProducts: topProductsEnriched,
      revenueByDay,
      recentOrders,
    };
  });
}
