import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(helmet());

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "http://localhost:5500,http://127.0.0.1:5500").split(",");
app.use(cors({ origin: (origin, cb) => {
  if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o.trim()))) return cb(null, true);
  cb(new Error("Not allowed by CORS"));
}}));

app.use(express.json({ limit: "4kb" }));

// Rate limiter
const rateMap = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
function rateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { start: now, count: 1 }); return next();
  }
  if (++entry.count > RATE_MAX) return res.status(429).json({ error: "Quá nhiều yêu cầu. Thử lại sau 1 phút." });
  next();
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL       = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MAX_MSG_LEN    = 3000;

/* ── POST /chat ─────────────────────────── */
app.post("/chat", rateLimiter, async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array required." });
    if (!OPENAI_API_KEY) return res.status(503).json({ error: "API key chưa được cấu hình." });

    // Validate each message
    for (const m of messages) {
      if (!m.role || !m.content) return res.status(400).json({ error: "Invalid message format." });
      if (String(m.content).length > MAX_MSG_LEN) return res.status(400).json({ error: "Message quá dài." });
    }

    const payload = {
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt || "Bạn là trợ lý AI của Craftory — thương hiệu bộ kit thủ công cho trẻ em Việt Nam. Trả lời bằng tiếng Việt, thân thiện và ngắn gọn." },
        ...messages,
      ],
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI error:", data?.error?.message);
      return res.status(502).json({ error: "Dịch vụ AI tạm thời không khả dụng." });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: "AI trả về phản hồi rỗng." });

    res.json({ reply });
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ." });
  }
});

/* ── POST /feedback ─── AI phân tích ảnh tác phẩm ── */
app.post("/feedback", rateLimiter, async (req, res) => {
  try {
    const { kitName, imageBase64 } = req.body;
    if (!kitName) return res.status(400).json({ error: "kitName required." });
    if (!OPENAI_API_KEY) return res.status(503).json({ error: "API key chưa được cấu hình." });

    const messages = imageBase64 ? [
      { role: "user", content: [
        { type: "text", text: `Đây là tác phẩm thủ công "${kitName}" do một bé nhỏ làm. Hãy nhận xét ngắn gọn và khuyến khích bé (3-4 câu), tập trung vào điểm sáng tạo và nỗ lực.` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ]},
    ] : [
      { role: "user", content: `Hãy đưa ra lời khuyến khích ngắn gọn cho bé đã hoàn thành bộ kit "${kitName}" (3-4 câu).` },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: imageBase64 ? "gpt-4o-mini" : AI_MODEL,
        max_tokens: 256,
        messages: [
          { role: "system", content: "Bạn là trợ lý AI khuyến khích của Craftory. Phản hồi bằng tiếng Việt, ấm áp, phù hợp với trẻ em." },
          ...messages,
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: "AI tạm thời không khả dụng." });
    const reply = data.choices?.[0]?.message?.content?.trim() || "Bé làm rất tốt! Tiếp tục phát huy nhé! 🌟";
    res.json({ reply });
  } catch (e) {
    console.error("Feedback error:", e);
    res.status(500).json({ error: "Lỗi máy chủ." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Craftory AI backend · Port ${PORT} · Model: ${AI_MODEL}`));
