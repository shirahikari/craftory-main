/* ═══════════════════════════════════════════════════
   CRAFTORY — DB Layer v1.0
   Simulated database using localStorage
   Supports: users, orders, videos, workshops, sessions
   ═══════════════════════════════════════════════════ */

const DB = (() => {
  /* ── Helpers ─────────────────────────────────────── */
  const get = k  => { try { return JSON.parse(localStorage.getItem('cdb_'+k) || 'null'); } catch { return null; } };
  const set = (k,v) => localStorage.setItem('cdb_'+k, JSON.stringify(v));
  const uid = ()  => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  /* Simple deterministic hash (demo only — not cryptographic) */
  function _hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  /* ── Seed Data ───────────────────────────────────── */
  function _seed() {
    if (get('seeded')) return;

    /* ── Admin user ── */
    const adminId = 'u_admin';
    const users = [{
      id:       adminId,
      email:    'admin@craftory.vn',
      password: _hash('craftory@2026'),
      name:     'Craftory Admin',
      role:     'admin',
      avatar:   'A',
      createdAt: '2026-01-01T00:00:00Z',
      purchases: [1,2,3,4,5,6,7,8,9],
    }];
    set('users', users);

    /* ── Sample orders ── */
    const now = Date.now();
    const orders = [
      { id:'ord_001', userId:'u_demo1', userName:'Nguyễn Thị Mai',    items:[{id:1,name:'Điều Ước Đầu Tiên',price:59000,qty:1}],   total:59000,  status:'delivered', date: new Date(now - 86400000*1).toISOString() },
      { id:'ord_002', userId:'u_demo2', userName:'Trần Văn Bình',     items:[{id:3,name:'Rồng Giấy Bay',price:75000,qty:2}],        total:150000, status:'shipped',   date: new Date(now - 86400000*2).toISOString() },
      { id:'ord_003', userId:'u_demo3', userName:'Lê Thị Hoa',        items:[{id:8,name:'Khu Rừng Phép Thuật',price:79000,qty:1}],  total:79000,  status:'pending',   date: new Date(now - 86400000*0).toISOString() },
      { id:'ord_004', userId:'u_demo4', userName:'Phạm Minh Tuấn',    items:[{id:2,name:'Vườn Bướm Xinh',price:65000,qty:1},{id:5,name:'Biển Xanh Kỳ Diệu',price:72000,qty:1}], total:137000, status:'delivered', date: new Date(now - 86400000*3).toISOString() },
      { id:'ord_005', userId:'u_demo5', userName:'Vũ Thị Thanh',      items:[{id:7,name:'Vũ Trụ Bé Nhỏ',price:85000,qty:1}],       total:85000,  status:'processing',date: new Date(now - 86400000*1).toISOString() },
      { id:'ord_006', userId:'u_demo6', userName:'Đặng Quốc Hùng',    items:[{id:9,name:'Sách Thủ Công Mùa Xuân',price:60000,qty:3}],total:180000,status:'delivered', date: new Date(now - 86400000*5).toISOString() },
      { id:'ord_007', userId:'u_demo1', userName:'Nguyễn Thị Mai',    items:[{id:4,name:'Ngôi Nhà Nhỏ',price:89000,qty:1}],         total:89000,  status:'shipped',   date: new Date(now - 86400000*0).toISOString() },
      { id:'ord_008', userId:'u_demo7', userName:'Hoàng Thị Linh',    items:[{id:6,name:'Phố Đèn Lồng',price:68000,qty:2}],         total:136000, status:'delivered', date: new Date(now - 86400000*4).toISOString() },
    ];
    set('orders', orders);

    /* ── Video library ── */
    const videos = [
      { id:'v001', kitId:1, kitName:'Origami Rừng Nhiệt Đới', title:'Giới thiệu bộ kit & nguyên liệu',         duration:'3:20', order:1, url:'', thumb:'🦜', uploadedAt:'2026-01-10T08:00:00Z', status:'published' },
      { id:'v002', kitId:1, kitName:'Origami Rừng Nhiệt Đới', title:'Bước 1–3: Gấp chim Toucan từng bước',     duration:'8:45', order:2, url:'', thumb:'🦜', uploadedAt:'2026-01-10T09:00:00Z', status:'published' },
      { id:'v003', kitId:1, kitName:'Origami Rừng Nhiệt Đới', title:'Bước 4–5: Gấp ếch & khỉ, trưng bày khung',duration:'6:10', order:3, url:'', thumb:'🦜', uploadedAt:'2026-01-10T10:00:00Z', status:'published' },
      { id:'v004', kitId:3, kitName:'Vòng Tay & Trang Sức',   title:'Giới thiệu kit & cách xâu hạt cơ bản',    duration:'4:15', order:1, url:'', thumb:'💎', uploadedAt:'2026-01-15T08:00:00Z', status:'published' },
      { id:'v005', kitId:3, kitName:'Vòng Tay & Trang Sức',   title:'Làm vòng tay hạt cườm & vòng đàn hồi',   duration:'12:30',order:2, url:'', thumb:'💎', uploadedAt:'2026-01-15T09:00:00Z', status:'published' },
      { id:'v006', kitId:3, kitName:'Vòng Tay & Trang Sức',   title:'Gắn charm & hoàn thiện 5 mẫu vòng tay',  duration:'7:20', order:3, url:'', thumb:'💎', uploadedAt:'2026-01-15T10:00:00Z', status:'published' },
      { id:'v007', kitId:7, kitName:'Vẽ & Tô Màu Khoa Học',  title:'Giới thiệu 4 tờ tranh khoa học',          duration:'5:00', order:1, url:'', thumb:'🔭', uploadedAt:'2026-02-01T08:00:00Z', status:'published' },
      { id:'v008', kitId:7, kitName:'Vẽ & Tô Màu Khoa Học',  title:'Tô màu hệ mặt trời & khủng long',         duration:'15:00',order:2, url:'', thumb:'🔭', uploadedAt:'2026-02-01T09:00:00Z', status:'draft'     },
    ];
    set('videos', videos);

    /* ── Workshop registrations ── */
    set('ws_regs', []);

    set('seeded', true);
  }

  /* ── Users module ────────────────────────────────── */
  const users = {
    getAll()     { return get('users') || []; },
    getById(id)  { return this.getAll().find(u => u.id === id) || null; },
    getByEmail(email) { return this.getAll().find(u => u.email.toLowerCase() === email.toLowerCase()) || null; },

    create({ email, password, name }) {
      const list = this.getAll();
      if (list.find(u => u.email.toLowerCase() === email.toLowerCase()))
        return { error: 'Email này đã được đăng ký.' };
      const user = {
        id:        'u_' + uid(),
        email,
        password:  _hash(password),
        name,
        role:      'user',
        avatar:    name.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString(),
        purchases: [],
      };
      list.push(user);
      set('users', list);
      const { password: _p, ...safe } = user;
      return { user: safe };
    },

    login(email, password) {
      const u = this.getByEmail(email);
      if (!u)                           return { error: 'Email chưa được đăng ký.' };
      if (u.password !== _hash(password)) return { error: 'Mật khẩu không đúng.' };
      const { password: _p, ...safe } = u;
      return { user: safe };
    },

    addPurchase(userId, productId) {
      const list = this.getAll();
      const u = list.find(x => x.id === userId);
      if (u && !u.purchases.includes(productId)) {
        u.purchases.push(productId);
        set('users', list);
      }
    },

    count() { return this.getAll().length; },
  };

  /* ── Orders module ───────────────────────────────── */
  const orders = {
    getAll()       { return get('orders') || []; },
    getByUser(uid) { return this.getAll().filter(o => o.userId === uid); },

    create({ userId, userName, items, total }) {
      const list = this.getAll();
      const order = {
        id:     'ord_' + uid(),
        userId, userName, items, total,
        status: 'pending',
        date:   new Date().toISOString(),
      };
      list.push(order);
      set('orders', list);

      // Update user.purchases so videos unlock immediately
      items.forEach(item => {
        if (item.id) users.addPurchase(userId, item.id);
      });

      // Refresh Auth session so Auth.user.purchases is current
      try {
        const allUsers = users.getAll();
        const u = allUsers.find(x => x.id === userId);
        if (u) {
          const { password: _p, ...safe } = u;
          const SESSION_KEY = 'craftory_session';
          localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        }
      } catch(e) {}

      return order;
    },

    updateStatus(orderId, status) {
      const list = this.getAll();
      const o = list.find(x => x.id === orderId);
      if (o) { o.status = status; set('orders', list); }
    },

    todayRevenue() {
      const today = new Date().toDateString();
      return this.getAll()
        .filter(o => new Date(o.date).toDateString() === today && o.status !== 'cancelled')
        .reduce((s, o) => s + (o.total || 0), 0);
    },

    weekRevenue() {
      const result = [];
      const now = new Date();
      for (let d = 6; d >= 0; d--) {
        const day = new Date(now); day.setDate(now.getDate() - d);
        const dayStr = day.toDateString();
        const rev = this.getAll()
          .filter(o => new Date(o.date).toDateString() === dayStr && o.status !== 'cancelled')
          .reduce((s, o) => s + (o.total || 0), 0);
        result.push({ date: day.toLocaleDateString('vi-VN',{weekday:'short',day:'numeric'}), rev });
      }
      return result;
    },

    count() { return this.getAll().length; },
  };

  /* ── Videos module ───────────────────────────────── */
  const videos = {
    getAll()           { return get('videos') || []; },
    getByKit(kitId)    { return this.getAll().filter(v => v.kitId === kitId).sort((a,b)=>a.order-b.order); },
    published()        { return this.getAll().filter(v => v.status === 'published'); },

    create({ kitId, kitName, title, duration, url, thumb, order }) {
      const list = this.getAll();
      const v = {
        id:         'v' + uid(),
        kitId, kitName, title, duration: duration || '0:00',
        url:        url || '',
        thumb:      thumb || '🎬',
        order:      order || list.filter(x => x.kitId === kitId).length + 1,
        uploadedAt: new Date().toISOString(),
        status:     'draft',
      };
      list.push(v);
      set('videos', list);
      return v;
    },

    update(id, fields) {
      const list = this.getAll();
      const i = list.findIndex(x => x.id === id);
      if (i >= 0) { list[i] = { ...list[i], ...fields }; set('videos', list); return list[i]; }
      return null;
    },

    delete(id) {
      const list = this.getAll().filter(x => x.id !== id);
      set('videos', list);
    },

    count() { return this.getAll().length; },
  };

  /* ── Workshop Registrations ──────────────────────── */
  const workshops = {
    getAll()    { return get('ws_regs') || []; },
    register(data) {
      const list = this.getAll();
      const reg = { id:'ws_'+uid(), ...data, registeredAt: new Date().toISOString() };
      list.push(reg);
      set('ws_regs', list);
      return reg;
    },
    count() { return this.getAll().length; },
  };

  /* ── Init ────────────────────────────────────────── */
  _seed();

  return { users, orders, videos, workshops };
})();
