const { PrismaClient } = require('@prisma/client');

async function deleteAllConversations() {
  const prisma = new PrismaClient();

  try {
    console.log('Menghapus semua conversation data...');

    // 1. Hapus semua EscrowAuditLog terlebih dahulu
    console.log('Menghapus EscrowAuditLog...');
    const deletedAuditLogs = await prisma.escrowAuditLog.deleteMany();
    console.log(`Berhasil menghapus ${deletedAuditLogs.count} EscrowAuditLog`);

    // 2. Hapus semua EscrowParticipant
    console.log('Menghapus EscrowParticipant...');
    const deletedEscrowParticipants = await prisma.escrowParticipant.deleteMany();
    console.log(`Berhasil menghapus ${deletedEscrowParticipants.count} EscrowParticipant`);

    // 3. Hapus semua EscrowCase
    console.log('Menghapus semua EscrowCase...');
    const deletedEscrows = await prisma.escrowCase.deleteMany();
    console.log(`Berhasil menghapus ${deletedEscrows.count} EscrowCase`);

    // 4. Hapus semua ChatMessage
    console.log('Menghapus ChatMessage...');
    const deletedMessages = await prisma.chatMessage.deleteMany();
    console.log(`Berhasil menghapus ${deletedMessages.count} ChatMessage`);

    // 5. Hapus semua ConversationParticipant
    console.log('Menghapus ConversationParticipant...');
    const deletedParticipants = await prisma.conversationParticipant.deleteMany();
    console.log(`Berhasil menghapus ${deletedParticipants.count} ConversationParticipant`);

    // 6. Hapus semua Offer
    console.log('Menghapus semua Offer...');
    const deletedOffers = await prisma.offer.deleteMany();
    console.log(`Berhasil menghapus ${deletedOffers.count} Offer`);

    // 7. Hapus semua Conversation
    console.log('Menghapus Conversation...');
    const deletedConversations = await prisma.conversation.deleteMany();
    console.log(`Berhasil menghapus ${deletedConversations.count} Conversation`);

    console.log('Semua conversation data berhasil dihapus!');

  } catch (error) {
    console.error('Error menghapus conversation data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllConversations();
