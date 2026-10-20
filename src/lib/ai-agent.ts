import { prisma } from "./prisma";

export interface AiLeadStructuredOutput {
  customer_message: string;
  lead_stage:
    | "NEW_LEAD"
    | "DISCOVERY"
    | "QUALIFIED"
    | "CONSULTATION"
    | "VALUE_PRESENTED"
    | "PROOF"
    | "OFFER"
    | "OBJECTION"
    | "HOT_LEAD"
    | "PAYMENT_PENDING"
    | "PAID"
    | "FOLLOW_UP"
    | "HUMAN_HANDOFF"
    | "LOST"
    | string;
  lead_temperature: "COLD" | "WARM" | "HOT" | "VERY_HOT" | string;
  lead_score: number;
  persona:
    | "PEMBURU_AKSES_BIAYA"
    | "PENCARI_ARAH_MENTOR"
    | "OPTIMIZER_SNBP"
    | "BUTUH_BUKTI_KEPERCAYAAN"
    | "EKSPLORASI_UMUM"
    | "UNKNOWN"
    | string;
  primary_goal: "SNBP" | "BEASISWA" | "JURUSAN" | string | null;
  primary_problem: string | null;
  primary_objection: "PRICE" | "PARENT" | "TRUST" | "NOT_READY" | "COMPETITOR" | string | null;
  intent:
    | "ASK_INFO"
    | "DISCOVERY"
    | "CONSULTATION"
    | "ASK_PRICE"
    | "ASK_BENEFIT"
    | "ASK_PROOF"
    | "OBJECTION"
    | "READY_TO_BUY"
    | "PAYMENT"
    | "COMPLAINT"
    | "FOLLOW_UP"
    | "OTHER"
    | string;
  next_action:
    | "ASK_GOAL"
    | "ASK_GRADE"
    | "ASK_MAJOR"
    | "ASK_CAMPUS"
    | "ASK_FINANCIAL_NEED"
    | "ASK_OBJECTION"
    | "SEND_VALUE"
    | "SEND_PROOF"
    | "SEND_OFFER"
    | "SEND_REGISTRATION_LINK"
    | "SEND_PAYMENT"
    | "FOLLOW_UP"
    | "HANDOFF_HUMAN"
    | "CLOSE_CONVERSATION"
    | string;
  follow_up_required: boolean;
  follow_up_time: string | null;
  proof_needed: boolean;
  proof_type:
    | "TESTIMONIAL"
    | "OUTPUT_SAMPLE"
    | "INSTITUTION_PROFILE"
    | "PROCESS"
    | "LEGALITY"
    | "OFFICE"
    | "SOCIAL_MEDIA"
    | "NEWS"
    | "NONE"
    | string;
  offer_ready: boolean;
  payment_ready: boolean;
  human_handoff: boolean;
  handoff_reason: string | null;
  need_external_data: boolean;
  missing_data: string[];
  affiliate_id: string | null;

  // Extracted entities to update contact
  extracted_name?: string | null;
  extracted_school?: string | null;
  extracted_target?: string | null;
}

export interface AiProcessResult {
  replyMessage: string;
  structuredOutput: AiLeadStructuredOutput;
  ragSourcesUsed: string[];
}

// Blacklisted words/phrases that cannot be a customer name (in lowercase)
export const INVALID_NAME_WORDS = new Set([
  // Greetings & Conversational Fillers
  "halo", "hai", "helo", "hello", "hey", "assalamualaikum", "asslm", "ass", "p", "ping", "tes", "test", "tes123",
  "selamat", "pagi", "siang", "sore", "malam", "siap", "oke", "ok", "iya", "ya", "nggak", "tidak", "bukan", "dong", "deh",
  "makasih", "terimakasih", "tks", "thanks", "thank", "you", "mohon", "tolong", "bantu",

  // Bot & Company Names / Roles / Pronouns
  "kak", "kakak", "kak cerdas", "cerdas", "lampung", "lampung cerdas", "admin", "min", "bot", "cs", "agent",
  "konsultan", "mentor", "tutor", "official", "user", "guest", "sobat", "sobat cerdas",
  "saya", "aku", "gue", "gua", "gw", "sy", "kamu", "anda", "dia", "mereka", "kita", "kami",
  "bro", "sis", "gan", "mas", "mbak", "bang", "pak", "bu", "ibu", "bapak", "om", "tante", "dek", "adik",
  "siswa", "murid", "anak", "ortu", "orang tua", "ayah", "bunda", "wali", "calon", "alumni",

  // Verbs, Inquiries & Education keywords
  "mau", "ingin", "pengen", "tanya", "bertanya", "bisa", "dapat", "sudah", "udah", "belum", "lagi", "sedang", "akan",
  "daftar", "mendaftar", "pendaftaran", "transfer", "bayar", "pembayaran", "tf", "isi", "formulir", "form",
  "link", "rekening", "info", "informasi", "biaya", "harga", "pricelist", "paket", "bimbel", "les", "program",
  "kuliah", "kampus", "jurusan", "prodi", "fakultas", "universitas", "univ", "ptn", "pts", "snbt", "snbp", "utbk",
  "beasiswa", "kip", "kipk", "jalur", "mandiri", "kedinasan", "rapor", "nilai", "tes", "tanpa tes",
  "sma", "smk", "man", "sekolah", "kelas", "grade", "angkatan", "gapyear", "gap year",
  "dari", "di", "ke", "pada", "untuk", "dengan", "dan", "atau", "adalah", "tentang", "soal", "cara", "gimana", "bagaimana", "kenapa", "kapan", "dimana", "siapa", "berapa", "apa"
]);

/**
 * Validates and formats a customer name candidate.
 * Returns clean Title Cased name if valid, or null if invalid/rejected.
 */
export function validateAndCleanCustomerName(rawName: string | null | undefined): string | null {
  if (!rawName || typeof rawName !== "string") return null;

  // Clean characters - keep only alphabets, spaces, standard quotes/hyphens/periods
  let cleaned = rawName
    .replace(/[^\p{L}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 2 || cleaned.length > 35) return null;

  // Strip prefixes like "Nama saya", "Saya", "Kak", etc. if present at start
  cleaned = cleaned.replace(/^(?:nama(?:\s+saya|\s+aku|\s+gue|\s+sy|ku)?|panggil(?:an)?(?:\s+saya|\s+aku|\s+aja|\s+saja)?|saya\s+adalah|kenalin|saya|aku|gue|sy|kak|kakak)\s*[:=]?\s*/i, "").trim();

  if (cleaned.length < 2) return null;

  // Split into words
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return null;

  const validNameWords: string[] = [];

  for (const word of words) {
    const wLower = word.toLowerCase().replace(/[^\w]/g, "");
    if (!wLower || wLower.length === 0) continue;

    // If word is in invalid list, stop immediately
    if (INVALID_NAME_WORDS.has(wLower)) {
      if (validNameWords.length === 0) return null;
      break;
    }

    if (word.length < 2 && !word.endsWith(".")) {
      continue;
    }

    const formattedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    validNameWords.push(formattedWord);
  }

  if (validNameWords.length === 0) return null;

  const resultName = validNameWords.join(" ");
  const fullLower = resultName.toLowerCase();

  if (
    INVALID_NAME_WORDS.has(fullLower) ||
    fullLower === "kak cerdas" ||
    fullLower === "sobat cerdas" ||
    fullLower === "lampung cerdas" ||
    fullLower.startsWith("siswa (")
  ) {
    return null;
  }

  if (resultName.length < 2) return null;

  return resultName;
}

/**
 * Extracts customer name from message text using strict Indonesian conversational patterns
 */
export function extractCustomerNameFromText(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  // Pattern 1: Explicit introduction keywords
  // e.g. "nama saya Budi", "namaku Siti Nurhaliza", "panggil saja Dimas", "kenalin saya Zahra"
  const explicitMatch = text.match(
    /(?:nama\s*(?:saya|aku|gue|sy|ku)?|namaku|panggil(?:an)?(?:\s*(?:saya|aku|gue|aja|saja|ku))?|kenalin(?:\s*(?:nama\s*saya|saya|nama\s*aku|aku))?)\s*(?:adalah|:|;|=)?\s*([A-Za-z\s'.-]{2,35})/i
  );

  if (explicitMatch && explicitMatch[1]) {
    const candidate = validateAndCleanCustomerName(explicitMatch[1]);
    if (candidate) return candidate;
  }

  // Pattern 2: Greeting with optional honorific followed by "saya [Name]" / "aku [Name]"
  // e.g. "Halo kak, saya Budi dari SMA 2", "Assalamu'alaikum kak, perkenalkan saya Zahra", "Selamat pagi min, saya Ridwan"
  const greetingPrefix = `(?:^|[.!?\\n]|(?:halo|hai|helo|hello|hey|assalamu['a-z]*|selamat\\s+(?:pagi|siang|sore|malam)|permisi|p)(?:[\\s,]+(?:kak|kakak|cerdas|kak\\s+cerdas|min|admin|mas|mbak|bang|pak|bu|om|tante|sobat|gan|bro|sis))?[,\\s!.]*)`;

  const introMatch = text.match(
    new RegExp(
      `${greetingPrefix}\\s*(?:perkenalkan\\s+)?(?:saya|aku|gue|sy)\\s+([A-Za-z\\s'.-]{2,30})`,
      "i"
    )
  );

  if (introMatch && introMatch[1]) {
    const candidate = validateAndCleanCustomerName(introMatch[1]);
    if (candidate) return candidate;
  }

  return null;
}

/**
 * Ekstraksi Entitas & Kualifikasi Tambahan dari teks pesan siswa
 */
export function enrichExtractedEntities(
  parsed: AiLeadStructuredOutput,
  customerMessage: string
): AiLeadStructuredOutput {
  const text = customerMessage.trim();
  const lower = text.toLowerCase();

  // 1. Deteksi Closing / Konfirmasi Pembayaran & Pendaftaran Terdaftar (PAID)
  const isPaidConfirmation =
    lower.includes("sudah daftar") ||
    lower.includes("udah daftar") ||
    lower.includes("sudah transfer") ||
    lower.includes("udah transfer") ||
    lower.includes("sudah bayar") ||
    lower.includes("udah bayar") ||
    lower.includes("sudah tf") ||
    lower.includes("udah tf") ||
    lower.includes("bukti transfer") ||
    lower.includes("bukti tf") ||
    lower.includes("sudah isi form") ||
    lower.includes("udah isi formulir") ||
    lower.includes("ini buktinya");

  if (isPaidConfirmation) {
    parsed.lead_stage = "PAID";
    parsed.lead_temperature = "VERY_HOT";
    parsed.lead_score = 100;
    parsed.payment_ready = true;
    parsed.intent = "PAYMENT";
    parsed.next_action = "CLOSE_CONVERSATION";
  }

  // 2. Ekstraksi dan Validasi Nama Siswa
  const cleanedParsedName = validateAndCleanCustomerName(parsed.extracted_name);
  if (cleanedParsedName) {
    parsed.extracted_name = cleanedParsedName;
  } else {
    parsed.extracted_name = extractCustomerNameFromText(customerMessage);
  }

  // 3. Ekstraksi Asal Sekolah
  if (!parsed.extracted_school) {
    const schoolMatch = text.match(
      /(?:sma|smk|man|sekolah di|dari sekolah|asal sekolah|alumni|gap year|gapyear)\s+([A-Za-z0-9\s]{2,35})/i
    );
    if (schoolMatch && schoolMatch[0]) {
      parsed.extracted_school = schoolMatch[0].trim();
    }
  }

  // 4. Ekstraksi Target Kampus & Jurusan
  if (!parsed.extracted_target) {
    const targetKeywords = [
      "kedokteran",
      "teknik",
      "hukum",
      "manajemen",
      "akuntansi",
      "psikologi",
      "farmasi",
      "keperawatan",
      "ilmu komunikasi",
      "unila",
      "itera",
      "itb",
      "ui",
      "ugm",
      "undip",
      "unpad",
      "ipb",
      "its",
      "unair",
      "ipdn",
      "stan",
      "poltekip",
      "poltekim",
      "stis",
      "stin",
      "poltekkes",
      "akpol",
      "akmil",
      "snbt",
      "snbp",
      "kuliah tanpa tes",
      "tanpa tes",
      "kedinasan",
      "mandiri",
    ];
    const hasTarget = targetKeywords.some((kw) =>
      text.toLowerCase().includes(kw)
    );
    if (hasTarget) {
      parsed.extracted_target = text;
    }
  }

  return parsed;
}

export async function processCustomerMessageWithAi(
  customerMessage: string,
  contact: {
    id: number;
    phoneNumber: string;
    customerName?: string | null;
    schoolOrigin?: string | null;
    targetCampusMajor?: string | null;
    leadStatus?: string;
    leadStage?: string;
    leadTemperature?: string;
    persona?: string;
    primaryGoal?: string | null;
    primaryProblem?: string | null;
    primaryObjection?: string | null;
    userId?: string;
  },
  recentMessages: { senderType: string; messageBody: string }[],
  userId?: string
): Promise<AiProcessResult> {
  const targetUserId = userId || contact.userId;
  if (!targetUserId) {
    throw new Error(
      "processCustomerMessageWithAi: userId wajib ada. Tidak ada fallback lintas tenant."
    );
  }

  // 1. Get AI Configuration scoped STRICTLY to this user (no cross-tenant fallback)
  const aiConfig = await prisma.aiConfiguration.findUnique({
    where: { userId: targetUserId },
  });

  const systemPrompt =
    aiConfig?.systemPrompt ||
    "Kamu adalah Kak Cerdas, Konsultan Edukasi resmi dari Lembaga Bimbingan Belajar Lampung Cerdas.";

  // 2. Retrieve ALL Knowledge Documents scoped STRICTLY to this user (RAG)
  const allDocs = await prisma.knowledgeDocument.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: "desc" },
  });
  const ragContext = allDocs
    .map((d) => `### [${d.category}] ${d.title}\n${d.content}`)
    .join("\n\n");

  // 3. Format Conversation History for Memory Context
  const historyText = recentMessages
    .slice(-10)
    .map(
      (m) =>
        `${m.senderType === "customer" ? "Siswa" : "Kak Cerdas"}: ${m.messageBody}`
    )
    .join("\n");

  // 4. Check if user configured an external LLM API key
  if (aiConfig?.apiKey && aiConfig.apiKey.trim().length > 5) {
    try {
      const promptInstruction = `
${systemPrompt}

## MATERI PROGRAM & KNOWLEDGE BASE RESMI LAMPUNG CERDAS:
${ragContext}

## FOKUS PROGRAM UTAMA:
- Program paling populer Lampung Cerdas adalah **Kuliah Tanpa Tes (KTT)** untuk pembinaan masuk PTN jalur tanpa tes/SNBP/prestasi rapor.
- Link Pendaftaran Kuliah Tanpa Tes: https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas
- Link Program Lainnya: https://lampungcerdas.com/program

## PROFIL SISWA SAAT INI (DATABASE CRM):
- Nama Terdaftar: ${contact.customerName || "Belum ada"}
- Asal Sekolah: ${contact.schoolOrigin || "Belum ada"}
- Target Kampus/Jurusan Impian: ${contact.targetCampusMajor || "Belum ada"}
- Primary Goal: ${contact.primaryGoal || "Belum ada"}
- Lead Stage: ${contact.leadStage || "NEW_LEAD"}
- Lead Temperature: ${contact.leadTemperature || "COLD"}
- Persona: ${contact.persona || "UNKNOWN"}

## ATURAN KETAT JAWABAN (STRICT GROUNDING & ZERO IMPROVISATION):
1. **FOKUS PROGRAM**: Utamakan mengarahkan siswa ke program pembinaan **Kuliah Tanpa Tes** (analisis nilai rapor, pemetaan indeks sekolah, dan strategi pemilihan jurusan).
2. **LINK RESMI**: Gunakan link https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas dan untuk program lainnya https://lampungcerdas.com/program.
3. **STRICT KE KNOWLEDGE BASE**: Jangan mengarang harga atau paket bimbingan fiktif yang tidak ada di Knowledge Base.
4. **KONFIRMASI CLOSING (PAID)**:
   - Beritahu siswa setelah mengisi link/transfer untuk membalas: *"SUDAH DAFTAR"* atau *"SUDAH TRANSFER"*.
   - Jika siswa menyatakan sudah daftar/transfer, tetapkan **"lead_stage": "PAID"**, **"lead_score": 100**, dan berikan ucapan selamat resmi bergabung!
5. **STRICT KE DATA SISWA & MEMORY**:
   - Jika Nama, Asal Sekolah, atau Target Kampus siswa SUDAH ADA di profil di atas atau di riwayat chat, JANGAN bertanya ulang!
6. **GAYA BAHASA**: Ramah, santun, terstruktur, padat, dan siap kirim ke WhatsApp tanpa berbelit-belit.

## ATURAN EKSTRAKSI ENTITAS KHUSUS (PENTING!):
- "extracted_name": HANYA isi jika siswa secara EKSPLISIT memperkenalkan nama pribadinya (contoh: "Nama saya Budi", "Namaku Siti", "Panggil saja Andi").
  * JANGAN PERNAH mengisi nama bot ("Kak Cerdas", "Admin", "CS", "Sobat Cerdas") sebagai extracted_name!
  * JANGAN PERNAH mengisi kata sapaan atau potongan kalimat (seperti "Kak", "Siswa", "Mau Tanya", "Saya Mau") sebagai extracted_name!
  * Jika siswa tidak memperkenalkan namanya secara eksplisit, WAJIB diisi null.
- "extracted_school": HANYA isi jika siswa menyebutkan asal sekolah/alumni/gapyear (contoh: "SMAN 1 Bandar Lampung"). Jika tidak ada, diisi null.
- "extracted_target": HANYA isi jika siswa menyebutkan target jurusan atau kampus impian (contoh: "Kedokteran UNILA"). Jika tidak ada, diisi null.

## RIWAYAT CHAT SEBELUMNYA (MEMORY):
${historyText || "Percakapan baru dimulai."}

## PESAN TERAKHIR DARI SISWA:
"${customerMessage}"

## INSTRUKSI KHUSUS OUTPUT JSON:
Struktur JSON yang dihasilkan HARUS PERSIS seperti berikut:
{
  "customer_message": "Teks pesan balasan WhatsApp dalam bahasa Indonesia yang ramah, akurat, dan siap dikirim langsung ke user",
  "lead_stage": "NEW_LEAD | DISCOVERY | QUALIFIED | CONSULTATION | VALUE_PRESENTED | PROOF | OFFER | OBJECTION | HOT_LEAD | PAYMENT_PENDING | PAID | FOLLOW_UP | HUMAN_HANDOFF | LOST",
  "lead_temperature": "COLD | WARM | HOT | VERY_HOT",
  "lead_score": 0,
  "persona": "PEMBURU_AKSES_BIAYA | PENCARI_ARAH_MENTOR | OPTIMIZER_SNBP | BUTUH_BUKTI_KEPERCAYAAN | EKSPLORASI_UMUM | UNKNOWN",
  "primary_goal": "SNBP | BEASISWA | JURUSAN | null",
  "primary_problem": "string atau null",
  "primary_objection": "PRICE | PARENT | TRUST | NOT_READY | COMPETITOR | null",
  "intent": "ASK_INFO | DISCOVERY | CONSULTATION | ASK_PRICE | ASK_BENEFIT | ASK_PROOF | OBJECTION | READY_TO_BUY | PAYMENT | COMPLAINT | FOLLOW_UP | OTHER",
  "next_action": "ASK_GOAL | ASK_GRADE | ASK_MAJOR | ASK_CAMPUS | ASK_FINANCIAL_NEED | ASK_OBJECTION | SEND_VALUE | SEND_PROOF | SEND_OFFER | SEND_REGISTRATION_LINK | SEND_PAYMENT | FOLLOW_UP | HANDOFF_HUMAN | CLOSE_CONVERSATION",
  "follow_up_required": false,
  "follow_up_time": null,
  "proof_needed": false,
  "proof_type": "TESTIMONIAL | OUTPUT_SAMPLE | INSTITUTION_PROFILE | PROCESS | LEGALITY | OFFICE | SOCIAL_MEDIA | NEWS | NONE",
  "offer_ready": false,
  "payment_ready": false,
  "human_handoff": false,
  "handoff_reason": null,
  "need_external_data": false,
  "missing_data": [],
  "affiliate_id": null,
  "extracted_name": null,
  "extracted_school": null,
  "extracted_target": null
}
`;

      const response = await fetch(
        `${aiConfig.providerBaseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: aiConfig.modelName || "gpt-4o-mini",
            temperature: 0.2,
            max_tokens: aiConfig.maxTokens ?? 700,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: promptInstruction },
              ...recentMessages.slice(-6).map((m) => ({
                role: (m.senderType === "customer" ? "user" : "assistant") as "user" | "assistant",
                content: m.messageBody,
              })),
              { role: "user", content: customerMessage },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        if (rawContent) {
          let parsed = JSON.parse(rawContent) as AiLeadStructuredOutput;
          parsed = enrichExtractedEntities(parsed, customerMessage);

          return {
            replyMessage: parsed.customer_message,
            structuredOutput: parsed,
            ragSourcesUsed: allDocs.map((d) => d.title),
          };
        }
      }
    } catch (err) {
      console.warn("[AI Agent] External LLM error, using smart fallback", err);
    }
  }

  // 5. Strict Heuristic Fallback Engine with Exact Focus on Kuliah Tanpa Tes
  return generateHeuristicStructuredFallback(
    customerMessage,
    contact,
    allDocs,
    recentMessages
  );
}

/**
 * Heuristic Structured Generator with Focus on Kuliah Tanpa Tes
 */
function generateHeuristicStructuredFallback(
  text: string,
  contact: any,
  docs: any[],
  recentMessages: { senderType: string; messageBody: string }[]
): AiProcessResult {
  const lower = text.toLowerCase();

  // Extract entities from message if provided by user
  const extractedName = extractCustomerNameFromText(text);
  let extractedSchool: string | null = null;
  let extractedTarget: string | null = null;

  // School extraction pattern
  const schoolMatch = text.match(
    /(?:sma|smk|man|sekolah di|dari sekolah|asal sekolah|alumni|gap year|gapyear)\s+([A-Za-z0-9\s]{2,35})/i
  );
  if (schoolMatch && schoolMatch[0]) {
    extractedSchool = schoolMatch[0].trim();
  }

  // Target campus/major pattern
  const targetMatch = text.match(
    /(?:kedokteran|hukum|teknik|manajemen|akuntansi|psikologi|farmasi|unila|itera|itb|ui|ugm|undip|ipdn|stan|poltekip|kedinasan|snbt|snbp|kuliah tanpa tes|tanpa tes)/i
  );
  if (targetMatch && targetMatch[0]) {
    extractedTarget = text;
  }

  const cleanSavedName = validateAndCleanCustomerName(contact.customerName);
  const name = extractedName || cleanSavedName || "Sobat Cerdas";
  const currentTarget = extractedTarget || contact.targetCampusMajor;

  // 1. Deteksi Closing / Konfirmasi Pembayaran & Pendaftaran Terdaftar (PAID)
  const isPaidConfirmation =
    lower.includes("sudah daftar") ||
    lower.includes("udah daftar") ||
    lower.includes("sudah transfer") ||
    lower.includes("udah transfer") ||
    lower.includes("sudah bayar") ||
    lower.includes("udah bayar") ||
    lower.includes("sudah tf") ||
    lower.includes("udah tf") ||
    lower.includes("bukti transfer") ||
    lower.includes("bukti tf") ||
    lower.includes("sudah isi form") ||
    lower.includes("udah isi formulir") ||
    lower.includes("ini buktinya");

  let reply = "";
  let leadStage = contact.leadStage || "DISCOVERY";
  let leadTemperature = contact.leadTemperature || "WARM";
  let leadScore = contact.leadScore || 45;
  let persona = contact.persona || "OPTIMIZER_SNBP";
  let primaryGoal: string | null = contact.primaryGoal || "SNBP";
  let primaryProblem: string | null = contact.primaryProblem || null;
  let primaryObjection: string | null = contact.primaryObjection || null;
  let intent = "ASK_INFO";
  let nextAction = "ASK_GOAL";
  let followUpRequired = false;
  let proofNeeded = false;
  let proofType = "NONE";
  let offerReady = false;
  let paymentReady = false;
  let humanHandoff = false;
  let handoffReason: string | null = null;

  if (isPaidConfirmation) {
    reply = `Selamat dan Terima Kasih banyak Kak ${name}! 🎉✨

Pendaftaran resmi Kakak di program pembinaan **Kuliah Tanpa Tes (KTT) Lampung Cerdas** telah berhasil diverifikasi dan tercatat sebagai *Member Terdaftar (Enrolled / Paid)*! 🎓

Tim konsultan akademik kami akan segera menghubungi Kakak via WhatsApp ini untuk:
1. Analisis & rasionalisasi nilai rapor untuk target ${currentTarget || "kampus impian"}
2. Penjadwalan sesi bimbingan strategi SNBP
3. Pengiriman modul & materi pendampingan resmi

Semangat berjuang, kami siap mendampingi Kakak sampai lolos di PTN impian tanpa tes! 🚀 Ada yang ingin Kakak tanyakan sebelum sesi dimulai? 😊`;
    leadStage = "PAID";
    leadTemperature = "VERY_HOT";
    leadScore = 100;
    intent = "PAYMENT";
    nextAction = "CLOSE_CONVERSATION";
    offerReady = true;
    paymentReady = true;
    primaryProblem = "Pendaftaran Kuliah Tanpa Tes telah berhasil (Paid / Closing)";
  } else if (
    lower.includes("daftar") ||
    lower.includes("link") ||
    lower.includes("formulir") ||
    lower.includes("rekening") ||
    lower.includes("transfer") ||
    lower.includes("cara ikut")
  ) {
    reply = `Wah mantap sekali Kak ${name}! Pilihan tepat untuk mengamankan kursi pembinaan **Kuliah Tanpa Tes** menuju ${currentTarget || "kampus impian"} bersama Lampung Cerdas. 🎉

📝 *Link Pendaftaran Resmi Kuliah Tanpa Tes:*
👉 https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas

🌐 *Pilihan Program Lainnya:*
👉 https://lampungcerdas.com/program

📌 *PENTING - Konfirmasi Setelah Mendaftar:*
Setelah Kakak mengisi link pendaftaran di atas, mohon konfirmasi dengan membalas pesan ini: *"SUDAH DAFTAR"* agar tim admin kami langsung memverifikasi dan mengaktifkan status akun pembinaan Kakak secara resmi!

Ada kendala dalam pengisian formulirnya Kak? 😊`;
    leadStage = "PAYMENT_PENDING";
    leadTemperature = "VERY_HOT";
    leadScore = 95;
    intent = "PAYMENT";
    nextAction = "SEND_REGISTRATION_LINK";
    offerReady = true;
    paymentReady = true;
    primaryProblem = "Mendapatkan link pendaftaran Kuliah Tanpa Tes";
  } else if (
    lower.includes("biaya") ||
    lower.includes("harga") ||
    lower.includes("bayar") ||
    lower.includes("paket")
  ) {
    const targetRef = currentTarget
      ? `persiapan ${currentTarget}`
      : "persiapan tembus PTN impian";
    reply = `Halo Kak ${name}! Program paling populer di Lampung Cerdas adalah **Kuliah Tanpa Tes (KTT)** yang berfokus pada pembinaan dan rasionalisasi peluang masuk PTN tanpa tes (jalur SNBP & prestasi rapor) untuk ${targetRef}. 🎓

✨ *Fasilitas Program Kuliah Tanpa Tes:*
- Analisis peluang lolos jurusan 1 & 2 berdasarkan indeks sekolah & alumni
- Bimbingan portofolio & sertifikat prestasi
- Konsultasi 1-on-1 bersama Master Konsultan Lampung Cerdas
- Pendampingan strategi beasiswa & keringanan UKT

📝 *Informasi & Pendaftaran Resmi:*
👉 https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas

Untuk melihat pilihan program bimbingan lainnya, Kakak juga bisa cek di:
🌐 https://lampungcerdas.com/program

Setelah membuka link, Kakak tertarik untuk langsung mendaftar batch terdekatnya? 😊`;
    leadStage = "CONSULTATION";
    leadTemperature = "HOT";
    leadScore = 75;
    intent = "ASK_PRICE";
    nextAction = "SEND_OFFER";
    persona = "OPTIMIZER_SNBP";
    offerReady = true;
    primaryProblem = "Menanyakan biaya & informasi program Kuliah Tanpa Tes";
  } else if (
    lower.includes("beasiswa") ||
    lower.includes("kip") ||
    lower.includes("potongan")
  ) {
    reply = `Halo Sobat Cerdas ${name}! Kabar gembira, program **Kuliah Tanpa Tes** di Lampung Cerdas juga mendampingi strategi pengajuan beasiswa (KIP-Kuliah, Beasiswa Prestasi, dan beasiswa mitra PTN) agar kuliah bisa bebas biaya! 🎓

${contact.schoolOrigin ? `Kakak dari ${contact.schoolOrigin} ya? ` : ""}Peluang lolos jalur tanpa tes sangat terbuka dengan pemetaan nilai rapor yang tepat.

📝 *Detail Program & Pendaftaran:*
👉 https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas

Mau kami bantu cek peluang nilai rapor Kakak untuk jurusan yang dituju? 😊`;
    leadStage = "QUALIFIED";
    leadTemperature = "WARM";
    leadScore = 65;
    persona = "PEMBURU_AKSES_BIAYA";
    primaryGoal = "BEASISWA";
    intent = "ASK_BENEFIT";
    nextAction = "SEND_VALUE";
  } else if (
    lower.includes("snbp") ||
    lower.includes("rapor") ||
    lower.includes("nilai") ||
    lower.includes("tanpa tes")
  ) {
    reply = `Halo Kak ${name}! Sangat tepat sekali, fokus utama kami adalah program pembinaan **Kuliah Tanpa Tes** untuk memaksimalkan peluang lolos jalur SNBP berdasarkan analisis rekam jejak alumni dan indeks sekolah. 📊

Kami akan bantu memetakan posisi nilai rapor Kakak agar penempatan Pilihan 1 & Pilihan 2 aman dan tidak gugur.

📝 *Daftar Program Kuliah Tanpa Tes:*
👉 https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas

Kakak sudah punya target jurusan & kampus impian yang ingin dianalisis? 😊`;
    leadStage = "VALUE_PRESENTED";
    leadTemperature = "WARM";
    leadScore = 70;
    persona = "OPTIMIZER_SNBP";
    primaryGoal = "SNBP";
    intent = "ASK_INFO";
    nextAction = "SEND_OFFER";
    offerReady = true;
  } else if (extractedTarget || extractedSchool || extractedName) {
    reply = `Salam kenal Kak ${name}! Senang sekali Kakak berjuang untuk target ${currentTarget || "kampus impian"}${extractedSchool ? ` dari ${extractedSchool}` : ""}. 🎓✨

Di Lampung Cerdas, program paling populer kami adalah **Kuliah Tanpa Tes**, yaitu pembinaan intensif untuk meloloskan siswa ke jurusan impian lewat jalur nilai rapor & portofolio prestasi.

📝 *Info & Pendaftaran Kuliah Tanpa Tes:*
👉 https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas
🌐 *Program Lainnya:* https://lampungcerdas.com/program

Boleh tahu nilai rata-rata rapor semester 1-5 Kakak di kisaran berapa agar kami bantu petakan peluangnya? 😊`;
    leadStage = "QUALIFIED";
    leadTemperature = "WARM";
    leadScore = 60;
    intent = "DISCOVERY";
    nextAction = "SEND_VALUE";
  } else if (
    lower.includes("komplain") ||
    lower.includes("kecewa") ||
    lower.includes("manusia") ||
    lower.includes("cs")
  ) {
    reply = `Mohon maaf atas ketidaknyamanannya Kak ${name}. Pesan Kakak segera diteruskan ke Konsultan Utama Lampung Cerdas (Human Specialist) untuk ditangani secara langsung ya. Mohon ditunggu sebentar Kak. 🙏`;
    leadStage = "HUMAN_HANDOFF";
    leadTemperature = "HOT";
    leadScore = 50;
    humanHandoff = true;
    handoffReason = "Permintaan bicara dengan admin manusia / komplain";
    intent = "COMPLAINT";
    nextAction = "HANDOFF_HUMAN";
  } else {
    reply = `Halo Sobat Cerdas ${name}! Selamat datang di Konsultan Edukasi Lampung Cerdas. 😊

Program paling populer kami adalah **Kuliah Tanpa Tes**, yaitu pembinaan masuk PTN impian lewat jalur tanpa tes (SNBP & analisis nilai rapor).

📝 *Pendaftaran Kuliah Tanpa Tes:*
👉 https://lampungcerdas.com/program/kuliah-tanpa-tes?ref=lampungcerdas

🌐 *Pilihan Program Lainnya:*
👉 https://lampungcerdas.com/program

Boleh tahu apa jurusan dan kampus impian yang ingin Kakak tuju tahun ini? ✨`;
    leadStage = "DISCOVERY";
    leadTemperature = "COLD";
    leadScore = 35;
    intent = "DISCOVERY";
    nextAction = "ASK_GOAL";
    persona = "OPTIMIZER_SNBP";
  }

  const structuredOutput: AiLeadStructuredOutput = {
    customer_message: reply,
    lead_stage: leadStage,
    lead_temperature: leadTemperature,
    lead_score: leadScore,
    persona,
    primary_goal: primaryGoal,
    primary_problem: primaryProblem,
    primary_objection: primaryObjection,
    intent,
    next_action: nextAction,
    follow_up_required: followUpRequired,
    follow_up_time: null,
    proof_needed: proofNeeded,
    proof_type: proofType,
    offer_ready: offerReady,
    payment_ready: paymentReady,
    human_handoff: humanHandoff,
    handoff_reason: handoffReason,
    need_external_data: false,
    missing_data: [],
    affiliate_id: null,
    extracted_name: extractedName,
    extracted_school: extractedSchool,
    extracted_target: extractedTarget,
  };

  return {
    replyMessage: reply,
    structuredOutput,
    ragSourcesUsed: docs.map((d) => d.title),
  };
}
