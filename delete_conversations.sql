-- Script untuk menghapus semua conversation data
-- Jalankan dalam urutan yang benar untuk menghindari foreign key constraint errors

-- 1. Hapus semua ChatMessage terlebih dahulu
DELETE FROM "ChatMessage";

-- 2. Hapus semua ConversationParticipant
DELETE FROM "ConversationParticipant";

-- 3. Hapus semua Offer yang terkait dengan Conversation
DELETE FROM "Offer" WHERE "conversationId" IS NOT NULL;

-- 4. Hapus semua EscrowCase yang terkait dengan Conversation
DELETE FROM "EscrowCase" WHERE "conversationId" IS NOT NULL;

-- 5. Hapus semua Conversation
DELETE FROM "Conversation";

-- Reset sequences jika diperlukan (uncomment jika ingin reset ID)
-- ALTER SEQUENCE IF EXISTS "Conversation_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS "ChatMessage_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS "ConversationParticipant_id_seq" RESTART WITH 1;
