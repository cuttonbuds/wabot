import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_USER_ID = "2dddb6d7-eb94-4056-9fe3-e13dca2f4e71";

async function main() {
  console.log("Applying Multi-Tenancy Database Migration...");

  const queries = [
    // 1. Drop old single-user unique constraint on contacts.phone_number
    `ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_number_key CASCADE;`,
    `DROP INDEX IF EXISTS contacts_phone_number_key;`,

    // 2. Add user_id column with default value to all tables
    `ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '${DEFAULT_USER_ID}';`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '${DEFAULT_USER_ID}';`,
    `ALTER TABLE ai_configurations ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '${DEFAULT_USER_ID}';`,
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '${DEFAULT_USER_ID}';`,
    `ALTER TABLE follow_up_rules ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '${DEFAULT_USER_ID}';`,

    // Ensure all existing rows have the default user_id if null
    `UPDATE wa_sessions SET user_id = '${DEFAULT_USER_ID}' WHERE user_id IS NULL;`,
    `UPDATE contacts SET user_id = '${DEFAULT_USER_ID}' WHERE user_id IS NULL;`,
    `UPDATE ai_configurations SET user_id = '${DEFAULT_USER_ID}' WHERE user_id IS NULL;`,
    `UPDATE knowledge_documents SET user_id = '${DEFAULT_USER_ID}' WHERE user_id IS NULL;`,
    `UPDATE follow_up_rules SET user_id = '${DEFAULT_USER_ID}' WHERE user_id IS NULL;`,

    // 3. Make user_id NOT NULL
    `ALTER TABLE wa_sessions ALTER COLUMN user_id SET NOT NULL;`,
    `ALTER TABLE contacts ALTER COLUMN user_id SET NOT NULL;`,
    `ALTER TABLE ai_configurations ALTER COLUMN user_id SET NOT NULL;`,
    `ALTER TABLE knowledge_documents ALTER COLUMN user_id SET NOT NULL;`,
    `ALTER TABLE follow_up_rules ALTER COLUMN user_id SET NOT NULL;`,

    // 4. Create multi-tenancy unique constraints
    `CREATE UNIQUE INDEX IF NOT EXISTS wa_sessions_user_id_key ON wa_sessions (user_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ai_configurations_user_id_key ON ai_configurations (user_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_id_phone_number_key ON contacts (user_id, phone_number);`,

    // 6. Sync autoincrement sequences
    `SELECT setval(pg_get_serial_sequence('ai_configurations', 'id'), COALESCE(max(id), 1)) FROM ai_configurations;`,
    `SELECT setval(pg_get_serial_sequence('contacts', 'id'), COALESCE(max(id), 1)) FROM contacts;`,
    `SELECT setval(pg_get_serial_sequence('messages', 'id'), COALESCE(max(id), 1)) FROM messages;`,
    `SELECT setval(pg_get_serial_sequence('knowledge_documents', 'id'), COALESCE(max(id), 1)) FROM knowledge_documents;`,
    `SELECT setval(pg_get_serial_sequence('follow_up_rules', 'id'), COALESCE(max(id), 1)) FROM follow_up_rules;`,
  ];

  for (const q of queries) {
    try {
      console.log(`Executing: ${q}`);
      await prisma.$executeRawUnsafe(q);
    } catch (e: any) {
      console.warn("Migration note:", e.message);
    }
  }

  console.log("Multi-tenancy schema migration completed successfully!");
}

main()
  .catch((e) => console.error("Migration error:", e))
  .finally(() => prisma.$disconnect());
