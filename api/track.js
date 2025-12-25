// api/track.js (Vercel Serverless Function - Node.js runtime)
export default async function handler(req, res) {
  // ===== CORS（让 Shopify 前端能调用）=====
  res.setHeader("Access-Control-Allow-Origin", "*"); // 你上线后建议改成只允许你的域名
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });

  const no = String(req.query.no || "").trim();
  if (!no) return res.status(400).json({ ok: false, message: "Missing tracking number" });

  try {
    // ===== 从 Vercel 环境变量读取密钥 =====
    const YT_API_URL = process.env.YT_API_URL;   // 云途查询接口URL
    const YT_APP_KEY = process.env.YT_APP_KEY;   // 云途key（如有）
    const YT_SECRET  = process.env.YT_SECRET;    // 云途secret（如有）

    if (!YT_API_URL) {
      return res.status(500).json({ ok: false, message: "Server not configured: missing YT_API_URL" });
    }

    // ===== 构造请求（下面 payload / headers / sign 需要按云途文档改）=====
    const payload = {
      trackingNo: no,
      // appKey: YT_APP_KEY,
      // timestamp: Date.now(),
      // sign: "TODO"
    };

    // 例：如果云途要求在 header 带 token
    const headers = {
      "Content-Type": "application/json"
      // "Authorization": `Bearer ${process.env.YT_TOKEN}`
    };

    // 发起请求到云途
    const r = await fetch(YT_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const rawText = await r.text();
    let raw;
    try { raw = JSON.parse(rawText); } catch { raw = { rawText }; }

    if (!r.ok) {
      return res.status(502).json({ ok: false, message: "Upstream error", upstreamStatus: r.status, raw });
    }

    // ===== 把云途返回映射成统一格式（按实际字段改）=====
    // 下面是“通用示例”，你拿到云途返回示例后，把 events 映射改一下就行
    const events = (raw?.data?.events || raw?.events || []).map(e => ({
      time: e.time || e.occurTime || e.dateTime || "",
      location: e.location || e.place || e.city || "",
      status: e.status || e.desc || e.detail || ""
    }));

    const out = {
      ok: true,
      carrier: "YunTu",
      trackingNo: no,
      lastStatus: events[0]?.status || raw?.data?.status || raw?.status || "",
      events
    };

    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error", error: String(err?.message || err) });
  }
}
