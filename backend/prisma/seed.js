import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PRODUCTS = [
  { id: 1, name: "Origami Rừng Nhiệt Đới", emoji: "🦜", collection: "Jungle Friends", category: "kit", ageRange: "4–6 tuổi", price: 59000, oldPrice: null, badge: "hot", bgColor: "#F0FDF4",
    description: "Khám phá thế giới động vật nhiệt đới qua nghệ thuật gấp giấy origami. Bé gấp chim toucan, ếch, khỉ và bướm rồi trưng bày trong khung kraft xinh xắn.",
    includes: ["60 tờ giấy origami màu nhiệt đới (15×15 cm)", "Giấy hướng dẫn minh hoạ 4 mẫu: toucan, ếch, khỉ, bướm", "Khung trưng bày bìa cứng kraft", "Nhãn dán trang trí chủ đề rừng nhiệt đới"],
    images: ["/assets/images/product-images/KIT01/KIT01-1.png"], status: "published" },
  { id: 2, name: "Mặt Nạ Thú Rừng", emoji: "🦁", collection: "Animal Kingdom", category: "kit", ageRange: "4–6 tuổi", price: 65000, oldPrice: 80000, badge: "sale", bgColor: "#FEF9E7",
    description: "Tự tay tô màu và hoàn thiện 4 chiếc mặt nạ thú rừng bằng màu nước. Sư tử, cáo, gấu, thỏ — mỗi chiếc là một tác phẩm riêng do bé sáng tạo.",
    includes: ["4 tấm mặt nạ bìa cứng cắt sẵn (sư tử, cáo, gấu, thỏ)", "Bảng màu nước 8 màu dạng bánh", "Cọ vẽ lông mềm", "Dây thun đeo mặt nạ", "Nhãn dán mắt & mũi trang trí", "Thẻ hướng dẫn tô màu in màu"],
    images: ["/assets/images/product-images/KIT02/KIT02-1.png"], status: "published" },
  { id: 3, name: "Vòng Tay & Trang Sức", emoji: "💎", collection: "Little Jewels", category: "kit", ageRange: "6–9 tuổi", price: 75000, oldPrice: null, badge: "new", bgColor: "#FDF4FF",
    description: "Thiết kế và làm 5 mẫu vòng tay handmade từ hạt cườm nhiều màu, dây đàn hồi và charm kim loại. Phát triển khéo léo đôi tay và óc thẩm mỹ.",
    includes: ["Hộp phân loại hạt cườm nhiều màu & hình (tròn, sao, tim)", "Dây đàn hồi trong suốt", "Dây da mỏng", "Charm kim loại (sao, tim, bướm, mặt trăng)", "Kim xâu hạt", "Giấy hướng dẫn 5 mẫu vòng tay"],
    images: ["/assets/images/product-images/KIT03/KIT03-1.png"], status: "published" },
  { id: 4, name: "Thiệp Pop-up 3D", emoji: "💌", collection: "Paper Magic", category: "kit", ageRange: "6–9 tuổi", price: 89000, oldPrice: null, badge: null, bgColor: "#FFF0F5",
    description: "Tạo những tấm thiệp pop-up 3D bất ngờ với hoa nở, lâu đài và cầu vồng. Mỗi tấm thiệp handmade là món quà độc đáo bé tự làm tặng người thân.",
    includes: ["4 tờ bìa cứng pastel cắt rãnh sẵn", "Giấy trang trí hoạ tiết", "Kéo đầu tròn an toàn", "Keo stick", "Bút marker 6 màu tươi", "Nhãn dán (hoa, sao, tim)", "4 phong bì trắng", "Giấy hướng dẫn gấp pop-up 3D"],
    images: ["/assets/images/product-images/KIT04/KIT04-1.png"], status: "published" },
  { id: 5, name: "Tranh Cát Nghệ Thuật", emoji: "🐢", collection: "Sandy Canvas", category: "kit", ageRange: "4–6 tuổi", price: 72000, oldPrice: 90000, badge: "sale", bgColor: "#FFF7ED",
    description: "Rắc cát màu lên khung hình có keo sẵn để tạo bức tranh sinh động. Bé phát triển kỹ năng tập trung và phối màu qua nghệ thuật cát đơn giản mà thú vị.",
    includes: ["2 khung tranh bìa cứng có keo sẵn (rùa biển & sao biển)", "8 ống cát màu", "Que đổ cát gỗ nhỏ", "Thẻ hướng dẫn minh hoạ"],
    images: ["/assets/images/product-images/KIT05/KIT05-1.png"], status: "published" },
  { id: 6, name: "Mô Hình 3D Giấy", emoji: "🗼", collection: "Architecture Jr.", category: "kit", ageRange: "9–12 tuổi", price: 68000, oldPrice: null, badge: "new", bgColor: "#EEF2FF",
    description: "Lắp ráp mô hình tháp Eiffel 3D từ bìa cứng đã in và cắt sẵn. Rèn luyện tư duy không gian, sự kiên nhẫn và kỹ năng lắp ghép cho bé.",
    includes: ["4 tờ bìa cứng dày đã in & cắt rãnh sẵn", "Dụng cụ gấp bone folder", "Keo dán chuyên dụng", "4 kẹp mini", "Giấy hướng dẫn lắp ghép 32 trang"],
    images: ["/assets/images/product-images/KIT06/KIT06-1.png"], status: "published" },
  { id: 7, name: "Vẽ & Tô Màu Khoa Học", emoji: "🔭", collection: "Science Art", category: "kit", ageRange: "6–9 tuổi", price: 85000, oldPrice: null, badge: null, bgColor: "#EFF6FF",
    description: "Tô màu những bức vẽ khoa học thú vị — hệ mặt trời, bộ xương khủng long, cơ thể người và thế giới đại dương. Học khoa học bằng màu sắc và đôi bàn tay.",
    includes: ["4 tờ tranh khoa học khổ lớn", "Bộ bút sáp 12 màu không độc", "Bút lông màu 6 màu tươi", "Nhãn dán ngôi sao khen thưởng", "Thước kẻ trong suốt", "Sách khoa học mini 20 trang"],
    images: ["/assets/images/product-images/KIT07/KIT07-1.png"], status: "published" },
  { id: 8, name: "Đồ Chơi Gỗ Chuyển Động", emoji: "🚗", collection: "STEM Builders", category: "kit", ageRange: "6–9 tuổi", price: 79000, oldPrice: 95000, badge: "sale", bgColor: "#FEF3C7",
    description: "Lắp ráp và sơn xe ô tô đồ chơi bằng gỗ birch thật. Từ mảnh gỗ, bánh xe nhựa đến dây cao su — trải nghiệm STEM thực chiến: thiết kế, lắp ghép, hoàn thiện.",
    includes: ["Các mảnh gỗ birch cắt sẵn (thân xe)", "4 bánh xe nhựa màu", "2 trục quay nhựa", "Dây cao su", "Búa nhựa mini an toàn", "Màu nước 4 màu & cọ vẽ", "Giấy hướng dẫn lắp ráp"],
    images: ["/assets/images/product-images/KIT08/KIT08-1.png"], status: "published" },
  { id: 9, name: "Nến & Xà Phòng Thủ Công", emoji: "🕯️", collection: "Little Botanist", category: "kit", ageRange: "9–12 tuổi", price: 60000, oldPrice: null, badge: null, bgColor: "#F5F0FF",
    description: "Tự tay làm nến đậu nành và xà phòng glycerin thơm từ hương liệu thiên nhiên. Bé học về khoa học chất liệu và trải nghiệm niềm vui tạo ra sản phẩm thực sự dùng được.",
    includes: ["Sáp đậu nành tự nhiên (đủ làm 2 nến)", "2 lọ hương liệu thiên nhiên (oải hương & cam)", "4 viên thuốc nhuộm màu an toàn", "2 tim nến cotton đế kim loại", "2 cốc đổ nến nhựa trong", "Que khuấy gỗ", "Thẻ hướng dẫn an toàn & từng bước"],
    images: ["/assets/images/product-images/KIT09/KIT09-1.png"], status: "published" },
  { id: 10, name: "Sách Origami Cơ Bản", emoji: "📗", collection: "Giấy hướng dẫn", category: "book", ageRange: "4–9 tuổi", price: 60000, oldPrice: null, badge: null, bgColor: "#F0FDF4",
    description: "50 mẫu origami từ dễ đến khó với hướng dẫn từng bước bằng hình ảnh màu sắc. Cuốn sách bạn đồng hành lý tưởng cho bé bắt đầu hành trình gấp giấy.",
    includes: ["128 trang in màu full", "50 mẫu origami chia theo cấp độ (dễ → nâng cao)", "Hướng dẫn step-by-step bằng hình minh hoạ", "Trang tô màu sáng tạo bonus", "Giấy can tặng kèm để tập gấp"],
    images: ["/assets/images/product-images/KIT10/KIT10-1.png"], status: "published" },
];

const WORKSHOPS = [
  { title: 'Workshop Origami Mùa Hè 2026', dateTime: new Date('2026-06-15T09:00:00+07:00'), capacity: 20, location: 'Craftory Studio – 123 Nguyễn Thị Minh Khai, Q.1, TP.HCM' },
  { title: 'Workshop Vẽ Màu Nước Cho Bé', dateTime: new Date('2026-07-01T14:00:00+07:00'), capacity: 15, location: 'Craftory Studio – 123 Nguyễn Thị Minh Khai, Q.1, TP.HCM' },
  { title: 'Workshop STEM – Đồ Chơi Gỗ', dateTime: new Date('2026-07-20T09:00:00+07:00'), capacity: 12, location: 'Craftory Studio – 123 Nguyễn Thị Minh Khai, Q.1, TP.HCM' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed users
  const adminHash = await bcrypt.hash('craftory@2026', 12);
  await prisma.user.upsert({
    where: { email: 'admin@craftory.vn' },
    update: {},
    create: { email: 'admin@craftory.vn', passwordHash: adminHash, name: 'Craftory Admin', role: 'admin' },
  });

  const empHash = await bcrypt.hash('employee@2026', 12);
  await prisma.user.upsert({
    where: { email: 'employee@craftory.vn' },
    update: {},
    create: { email: 'employee@craftory.vn', passwordHash: empHash, name: 'Craftory Employee', role: 'employee' },
  });

  // Seed products
  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }
  console.log(`✅ Seeded ${PRODUCTS.length} products`);

  // Seed workshops
  for (const ws of WORKSHOPS) {
    const existing = await prisma.workshop.findFirst({ where: { title: ws.title } });
    if (!existing) {
      await prisma.workshop.create({ data: ws });
    }
  }
  console.log(`✅ Seeded ${WORKSHOPS.length} workshops`);

  console.log('✅ Seeding complete!');
  console.log('\n📋 Demo accounts:');
  console.log('   Admin:    admin@craftory.vn / craftory@2026');
  console.log('   Employee: employee@craftory.vn / employee@2026');
}

main().catch(console.error).finally(() => prisma.$disconnect());
