import { z } from 'zod';

const regSchema = z.object({
  workshopId: z.string().min(1),
  guestName: z.string().min(2).optional(),
  guestPhone: z.string().min(8).optional(),
});

export default async function workshopRoutes(fastify) {
  // GET /api/v1/workshops
  fastify.get('/workshops', async () => {
    const workshops = await fastify.prisma.workshop.findMany({
      orderBy: { dateTime: 'asc' },
      include: { _count: { select: { registrations: true } } },
    });
    return { workshops };
  });

  // GET /api/v1/workshops/:id
  fastify.get('/workshops/:id', async (req, reply) => {
    const workshop = await fastify.prisma.workshop.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { registrations: true } } },
    });
    if (!workshop) return reply.code(404).send({ message: 'Không tìm thấy workshop.' });
    return { workshop };
  });

  // POST /api/v1/workshops/register
  fastify.post('/workshops/register', async (req, reply) => {
    const parsed = regSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.' });
    }

    const { workshopId, guestName, guestPhone } = parsed.data;
    const workshop = await fastify.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) return reply.code(404).send({ message: 'Không tìm thấy workshop.' });

    const regCount = await fastify.prisma.workshopRegistration.count({ where: { workshopId } });
    if (regCount >= workshop.capacity) {
      return reply.code(409).send({ message: 'Workshop đã đầy chỗ.' });
    }

    const data = { workshopId };
    if (req.user) {
      data.userId = req.user.id;
    } else {
      data.guestName = guestName;
      data.guestPhone = guestPhone;
    }

    const registration = await fastify.prisma.workshopRegistration.create({ data });
    reply.code(201);
    return { message: 'Đăng ký thành công!', registration };
  });
}
