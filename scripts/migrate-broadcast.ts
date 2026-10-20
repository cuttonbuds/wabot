import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating broadcast tables in Supabase PostgreSQL...");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS broadcast_campaigns (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL DEFAULT '2dddb6d7-eb94-4056-9fe3-e13dca2f4e71',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      total_groups INT NOT NULL DEFAULT 0,
      success_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
      delay_seconds INT NOT NULL DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_user_id ON broadcast_campaigns(user_id);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS broadcast_logs (
      id BIGSERIAL PRIMARY KEY,
      campaign_id BIGINT REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
      group_jid VARCHAR(150) NOT NULL,
      group_name VARCHAR(255),
      status VARCHAR(50) NOT NULL,
      error_message TEXT,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_broadcast_logs_campaign_id ON broadcast_logs(campaign_id);
  `);

  console.log("Broadcast tables created successfully!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
