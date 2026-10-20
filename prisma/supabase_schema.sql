-- ================================================================
-- SQL SCHEMA & MIGRATION: LAMPUNG CERDAS WHATSAPP AI SALES AGENT
-- Target Database: Supabase PostgreSQL
-- ================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Drop Tables if doing full reset
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS contacts CASCADE;
-- DROP TABLE IF EXISTS wa_sessions CASCADE;
-- DROP TABLE IF EXISTS follow_up_rules CASCADE;
-- DROP TABLE IF EXISTS ai_configurations CASCADE;
-- DROP TABLE IF EXISTS knowledge_documents CASCADE;

-- ----------------------------------------------------------------
-- 3. Tabel Kontak Calon Siswa (Leads CRM dengan Structured Telemetry)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(30) UNIQUE NOT NULL,
    customer_name VARCHAR(150),
    school_origin VARCHAR(150),
    target_campus_major VARCHAR(200),
    lead_status VARCHAR(50) NOT NULL DEFAULT 'Cold',
    handling_status VARCHAR(30) NOT NULL DEFAULT 'AI_HANDLED',
    sentiment VARCHAR(30) NOT NULL DEFAULT 'Neutral',

    -- Kolom Struktur JSON Kualifikasi AI
    lead_stage VARCHAR(50) NOT NULL DEFAULT 'NEW_LEAD',
    lead_temperature VARCHAR(30) NOT NULL DEFAULT 'COLD',
    lead_score INT NOT NULL DEFAULT 0,
    persona VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    primary_goal VARCHAR(100),
    primary_problem TEXT,
    primary_objection VARCHAR(50),
    intent VARCHAR(50),
    next_action VARCHAR(50),
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_time TIMESTAMP WITH TIME ZONE,
    proof_needed BOOLEAN DEFAULT FALSE,
    proof_type VARCHAR(50),
    offer_ready BOOLEAN DEFAULT FALSE,
    payment_ready BOOLEAN DEFAULT FALSE,
    human_handoff BOOLEAN DEFAULT FALSE,
    handoff_reason TEXT,
    need_external_data BOOLEAN DEFAULT FALSE,
    missing_data TEXT,
    affiliate_id VARCHAR(100),

    last_customer_message_at TIMESTAMP WITH TIME ZONE,
    last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrasi Tambah Kolom jika tabel sudah dibuat sebelumnya di Supabase
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_stage VARCHAR(50) DEFAULT 'NEW_LEAD';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(30) DEFAULT 'COLD';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS persona VARCHAR(50) DEFAULT 'UNKNOWN';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_goal VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_problem TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_objection VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS intent VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_action VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS follow_up_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS proof_needed BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS proof_type VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS offer_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS payment_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS human_handoff BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS handoff_reason TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS need_external_data BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS missing_data TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS affiliate_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON contacts(lead_status);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_stage ON contacts(lead_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_handling ON contacts(handling_status);

-- ----------------------------------------------------------------
-- 4. Tabel Sesi WhatsApp (WAHA Gateway)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_sessions (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    session_name VARCHAR(100) NOT NULL DEFAULT 'CS Lampung Cerdas 1',
    status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED',
    qr_code_raw TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. Tabel Riwayat Pesan Percakapan (Messages)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    waha_message_id VARCHAR(100) UNIQUE,
    sender_type VARCHAR(20) NOT NULL,
    message_body TEXT NOT NULL,
    is_follow_up BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_waha_id ON messages(waha_message_id);

-- ----------------------------------------------------------------
-- 6. Tabel Aturan Follow-Up Edukasi Otomatis
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follow_up_rules (
    id BIGSERIAL PRIMARY KEY,
    rule_name VARCHAR(150) NOT NULL,
    target_lead_status VARCHAR(50) NOT NULL,
    inactivity_hours INT NOT NULL,
    ai_prompt_instruction TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 7. Tabel Konfigurasi AI & Persona Konsultan
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_configurations (
    id SERIAL PRIMARY KEY,
    provider_base_url VARCHAR(255) NOT NULL DEFAULT 'https://api.openai.com/v1',
    api_key_encrypted TEXT DEFAULT '',
    model_name VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    temperature NUMERIC(3,2) DEFAULT 0.60,
    max_tokens INT DEFAULT 600,
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 8. Tabel Dokumen Knowledge Base (RAG)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 9. Tabel Broadcast WhatsApp ke Grup
-- ----------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_user_id ON broadcast_campaigns(user_id);

CREATE TABLE IF NOT EXISTS broadcast_logs (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
    group_jid VARCHAR(150) NOT NULL,
    group_name VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_campaign_id ON broadcast_logs(campaign_id);

