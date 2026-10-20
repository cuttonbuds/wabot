import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Lampung Cerdas database...");

  // 1. Initial WA Session
  await prisma.waSession.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      sessionName: "CS Lampung Cerdas 1",
      status: "CONNECTED",
    },
  });

  // 2. AI Configuration
  const defaultPrompt = `Kamu adalah Kak Cerdas, Konsultan Edukasi & Sales Resmi dari Lembaga Bimbingan "Lampung Cerdas".
Tugasmu adalah menyapa siswa/orang tua dengan ramah, hangat, santun, dan penuh semangat ("Halo Kak!", "Halo Sobat Cerdas!").

Panduan Komunikasi:
1. Pahami kebutuhan calon siswa (target kampus, jalur seleksi SNBP/SNBT/Kedinasan/Mandiri, atau kebutuhan beasiswa).
2. Berikan informasi paket program Lampung Cerdas yang paling relevan secara akurat berdasarkan Knowledge Base.
3. Selalu arahkan ke solusi bimbingan terbaik dan ajak untuk mendaftar atau konsultasi lebih lanjut dengan ramah (Closing persuasif tanpa memaksa).
4. Jika ditanya harga, jelaskan manfaat & fasilitas lengkapnya terlebih dahulu sebelum menyebutkan nominal harga dan kemudahan cicilan.
5. Jika ada hal yang belum ada di materi atau keluhan khusus, tawarkan untuk diteruskan ke Kakak Konsultan Utama (Human CS).

Format Jawaban:
- Gunakan bahasa Indonesia yang santun, bersahabat, terstruktur dengan poin-poin yang mudah dibaca di layar WhatsApp.
- Hindari kalimat terlalu panjang atau berbelit-belit.`;

  const existingAi = await prisma.aiConfiguration.findFirst();
  if (!existingAi) {
    await prisma.aiConfiguration.create({
      data: {
        providerBaseUrl: "https://api.openai.com/v1",
        apiKey: "",
        modelName: "gpt-4o-mini",
        temperature: 0.6,
        maxTokens: 600,
        systemPrompt: defaultPrompt,
      },
    });
  }

  // 3. Knowledge Documents
  const knowledgeData = [
    {
      title: "Program Bimbel Intensif SNBT & UTBK 2026",
      category: "Paket_Bimbel",
      content: `Program Bimbingan Intensif SNBT & UTBK Lampung Cerdas:
- Ditujukan untuk siswa kelas 12 SMA/SMK/MA dan Alumni (Gap Year).
- Fasilitas: Kelas belajar interaktif (online & offline), Bank Soal TPS & Literasi terupdate, 15x Try Out Akbar dengan sistem IRT mirip aslinya, Modul Moderen Bedah Tuntas, Konsultasi Rasionalisasi Jurusan 1-on-1 dengan Konsultan Senior, Garansi Pendampingan hingga Ujian Mandiri.
- Pilihan Kelas:
  1. Kelas Regular Online: Rp 1.450.000 (bisa dicicil 2x).
  2. Kelas Super Intensif Karantina/VIP: Rp 3.250.000 (bisa dicicil 3x).
- Kuota terbatas hanya 25 siswa per batch agar pendampingan maksimal.`,
    },
    {
      title: "Program Bimbingan Sekolah Kedinasan (IPDN, STAN, Poltekip, STIS)",
      category: "Paket_Bimbel",
      content: `Program Bimbingan Masuk Sekolah Kedinasan Lampung Cerdas:
- Ditujukan bagi calon praja/taruna yang ingin lulus sekolah kedinasan bebas biaya kuliah dan langsung CPNS.
- Materi: Bedah SKD (TWK, TIU, TKP) dengan metode 'Smart Solution' cepat & tepat, Bimbingan Tes Fisik/Kesamaptaan, Simulasi Tes Psikotes & Wawancara.
- Fasilitas: Akses CAT Online Ribuan Soal, Mentoring langsung oleh Alumni Kedinasan berprestasi, Garansi materi update sesuai PermenPAN-RB terbaru.
- Investasi: Rp 2.750.000 (termasuk modul lengkap & try out CAT berkala).`,
    },
    {
      title: "Pendampingan SNBP & Analisis Rasionalisasi Nilai Rapor",
      category: "Paket_Bimbel",
      content: `Program Analisis Rapor & Portofolio SNBP Lampung Cerdas:
- Membantu siswa kelas 12 eligible memetakan peluang lolos di PTN favorit (Unila, ITERA, UI, ITB, UGM, Undip, Unair, dll) berdasarkan rekam jejak alumni dan indeks sekolah.
- Fasilitas: Report PDF Rasionalisasi Jurusan Lengkap, Konsultasi via Zoom/WhatsApp dengan Master Consultant Lampung Cerdas, Strategi penempatan Pilihan 1 & 2 agar tidak gugur.
- Biaya: Rp 299.000 per siswa (Diskon khusus menjadi Rp 199.000 untuk pendaftar minggu ini).`,
    },
    {
      title: "Informasi Pembayaran & Rekening Resmi Lampung Cerdas",
      category: "Biaya",
      content: `Metode Pembayaran Resmi Lampung Cerdas:
- Bank Transfer: BCA (No Rek: 123-456-7890 a.n. PT Lampung Cerdas Edukasi), Bank Mandiri, BSI, dan BRI.
- Pembayaran via QRIS (Semua E-Wallet: GoPay, OVO, ShopeePay, DANA).
- Skema Cicilan: Disediakan program cicilan tanpa bunga (DP minimal 50%, sisa dilunasi pada bulan berikutnya).
- Konfirmasi Pembayaran: Kirim bukti transfer ke nomor WhatsApp CS ini dengan format: [Nama Siswa]_[Paket Program]_[Bukti Transfer].`,
    },
    {
      title: "FAQ Umum & Beasiswa Lampung Cerdas",
      category: "FAQ",
      content: `Tanya Jawab Seputar Lampung Cerdas:
Q: Apakah ada beasiswa potongan biaya bimbel?
A: Ya! Lampung Cerdas menyediakan 'Beasiswa Juara' (potongan biaya s.d 50%) bagi siswa berprestasi ranking 1-3 paralel atau pemegang KIP-Kuliah/SKTM.
Q: Jika saya berada di luar kota Bandar Lampung, apakah bisa ikut?
A: Sangat bisa! Kami menyediakan platform Belajar Online via Live Zoom interaktif dengan rekaman kelas yang bisa ditonton ulang kapan saja.
Q: Bagaimana cara mendaftar?
A: Cukup ketik 'DAFTAR [Nama Paket]', konsultan kami akan mengirimkan link formulir pendaftaran resmi.`,
    },
  ];

  for (const doc of knowledgeData) {
    const existing = await prisma.knowledgeDocument.findFirst({
      where: { title: doc.title },
    });
    if (!existing) {
      await prisma.knowledgeDocument.create({ data: doc });
    }
  }

  // 4. Follow-up Rules
  const rules = [
    {
      ruleName: "Follow Up 3 Jam - Prospek Tanya Paket (Warm)",
      targetLeadStatus: "Warm",
      inactivityHours: 3,
      aiPromptInstruction:
        "Sapa kembali calon siswa dengan hangat. Tanyakan apakah ada kendala atau materi program yang masih ingin diketahui lebih lanjut, lalu tawarkan bonus e-book tips tembus PTN.",
      isActive: true,
    },
    {
      ruleName: "Follow Up 24 Jam - Pending Form & Pembayaran (Hot)",
      targetLeadStatus: "Hot",
      inactivityHours: 24,
      aiPromptInstruction:
        "Ingatkan dengan ramah mengenai sisa kuota batch bimbingan yang hampir penuh. Tanyakan apakah membutuhkan bantuan pembayaran atau konfirmasi link formulir.",
      isActive: true,
    },
    {
      ruleName: "Follow Up 48 Jam - Prospek Pasif (Cold)",
      targetLeadStatus: "Cold",
      inactivityHours: 48,
      aiPromptInstruction:
        "Kirim pesan sapaan edukatif berisi info jadwal Try Out gratis atau tips pemilihan jurusan dari Lampung Cerdas.",
      isActive: true,
    },
  ];

  for (const rule of rules) {
    const existing = await prisma.followUpRule.findFirst({
      where: { ruleName: rule.ruleName },
    });
    if (!existing) {
      await prisma.followUpRule.create({ data: rule });
    }
  }

  // 5. Initial Contacts & Messages (for demo realism)
  const demoContacts = [
    {
      phoneNumber: "6281278901234",
      customerName: "Rizky Pratama",
      schoolOrigin: "SMAN 1 Bandar Lampung",
      targetCampusMajor: "Kedokteran UNILA (SNBT)",
      leadStatus: "Hot",
      handlingStatus: "AI_HANDLED",
      sentiment: "Positive",
      messages: [
        {
          senderType: "customer",
          messageBody:
            "Halo Kak, mau tanya bimbel intensif SNBT untuk persiapan masuk Kedokteran Unila ada kelas apa saja ya?",
        },
        {
          senderType: "ai",
          messageBody:
            "Halo Sobat Cerdas Rizky! Senang sekali kamu berjuang menuju Kedokteran UNILA. Untuk persiapan Kedokteran, kami sangat merekomendasikan Kelas Super Intensif VIP SNBT karena ada simulasi Try Out IRT berkala dan bimbingan 1-on-1 dengan konsultan senior. Mau info jadwal batch terdekatnya Kak?",
        },
        {
          senderType: "customer",
          messageBody: "Boleh Kak, biayanya berapa ya dan bisa dicicil?",
        },
      ],
    },
    {
      phoneNumber: "6285298765432",
      customerName: "Siti Rahmawati",
      schoolOrigin: "SMAN 2 Metro",
      targetCampusMajor: "IPDN / Kedinasan",
      leadStatus: "Warm",
      handlingStatus: "AI_HANDLED",
      sentiment: "Positive",
      messages: [
        {
          senderType: "customer",
          messageBody:
            "Selamat siang, apakah di Lampung Cerdas ada bimbel khusus tes SKD Sekolah Kedinasan IPDN?",
        },
        {
          senderType: "ai",
          messageBody:
            "Siang Sobat Cerdas Siti! Tentu ada, di Lampung Cerdas kami punya Program Spesialis Bimbingan Sekolah Kedinasan yang mencakup Bedah SKD (TWK, TIU, TKP) dengan metode Smart Solution, tes fisik kesamaptaan, dan simulasi CAT online. Kakak berencana tes kedinasan tahun ini?",
        },
      ],
    },
    {
      phoneNumber: "6281311223344",
      customerName: "Pak Hendra (Orang Tua)",
      schoolOrigin: "SMAN 1 Pringsewu",
      targetCampusMajor: "Teknik Informatika ITB",
      leadStatus: "Pending_Payment",
      handlingStatus: "MANUAL_TAKEOVER",
      sentiment: "Positive",
      messages: [
        {
          senderType: "customer",
          messageBody:
            "Halo, saya ingin daftarkan anak saya paket karantina SNBT. Bisa kirimkan nomor rekening BCA untuk pelunasan?",
        },
        {
          senderType: "agent",
          messageBody:
            "Halo Pak Hendra, terima kasih banyak atas kepercayaannya pada Lampung Cerdas. Untuk pembayaran silakan transfer ke BCA 123-456-7890 a.n. PT Lampung Cerdas Edukasi. Setelah transfer mohon kirimkan buktinya di sini ya Pak.",
        },
      ],
    },
  ];

  const seedUserId = "2dddb6d7-eb94-4056-9fe3-e13dca2f4e71";

  for (const c of demoContacts) {
    const existing = await prisma.contact.findUnique({
      where: {
        userId_phoneNumber: {
          userId: seedUserId,
          phoneNumber: c.phoneNumber,
        },
      },
    });
    if (!existing) {
      const contact = await prisma.contact.create({
        data: {
          userId: seedUserId,
          phoneNumber: c.phoneNumber,
          customerName: c.customerName,
          schoolOrigin: c.schoolOrigin,
          targetCampusMajor: c.targetCampusMajor,
          leadStatus: c.leadStatus,
          handlingStatus: c.handlingStatus,
          sentiment: c.sentiment,
          lastCustomerMessageAt: new Date(),
        },
      });

      for (const m of c.messages) {
        await prisma.message.create({
          data: {
            contactId: contact.id,
            senderType: m.senderType,
            messageBody: m.messageBody,
          },
        });
      }
    }
  }

  console.log("Database seeded successfully with Lampung Cerdas data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
