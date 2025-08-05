import axios from 'axios';

interface ContactData {
  name: string;
  company?: string;
  primary_email: string;
  primary_phone?: string;
}

interface ResearchData {
  success: boolean;
  telegramMessage: string;
}

interface DbResult {
  isNewContact: boolean;
  touchpointHistory?: any[];
  contactNotes?: string | null;
}

function getTelegramChatId(personName?: string | null): string | undefined {
  const defaultChatId = process.env.TELEGRAM_CHAT_ID_ANTON;

  if (!personName) {
    console.log('⚠️ No person name provided, using Anton as default');
    return defaultChatId;
  }

  const name = personName.toLowerCase();
  const chatId = process.env[`TELEGRAM_CHAT_ID_${name.toUpperCase()}`];

  if (chatId) {
    console.log(`📱 Using ${personName}'s Telegram chat ID`);
    return chatId;
  }

  console.log(`⚠️ Unknown person name "${personName}", using Anton's chat ID as default`);
  return defaultChatId;
}

function escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

export async function sendTelegramNotification(
  contactData: ContactData,
  research: ResearchData,
  dbResult: DbResult,
  imagePath: string
) {
  try {
    const personName = imagePath.split('/').pop()?.split('.')[0]?.match(/_([A-Za-z]+)$/)?.[1];
    const chatId = getTelegramChatId(personName);

    if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
      console.error('❌ Telegram Bot Token or Chat ID is not configured.');
      return;
    }

    let messageText = '';
    if (dbResult.isNewContact) {
      messageText = `✅ ${contactData.name}\n` +
                    `🏢 ${contactData.company || 'Not specified'}\n` +
                    `📧 ${contactData.primary_email}\n` +
                    (contactData.primary_phone ? `📞 ${contactData.primary_phone}\n` : '') +
                    `\n${research.telegramMessage}`;
    } else {
      messageText = `🔄 ${contactData.name}\n🏢 ${contactData.company || 'Not specified'}`;
      if (dbResult.touchpointHistory && dbResult.touchpointHistory.length > 0) {
        messageText += `\n\n📅 **Previous interactions:**`;
        dbResult.touchpointHistory.slice(0, 5).forEach(tp => {
          const date = new Date(tp.created_at).toLocaleDateString();
          const addedBy = tp.added_by ? ` (${tp.added_by})` : '';
          messageText += `\n• ${date}: ${tp.source}${addedBy}`;
        });
      }
      if (dbResult.contactNotes) {
        messageText += `\n\n💡 **Notes:**\n${dbResult.contactNotes}`;
      }
    }

    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: escapeMarkdown(messageText),
      parse_mode: 'MarkdownV2',
    });

    console.log('✅ Telegram notification sent successfully.');
  } catch (error: any) {
    console.error('❌ Failed to send Telegram notification:', error.message);
  }
}

export async function sendTelegramError(errorMessage: string, personName?: string | null) {
    try {
        const chatId = getTelegramChatId(personName);
        if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
            console.error('❌ Telegram Bot Token or Chat ID is not configured for error reporting.');
            return;
        }

        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: escapeMarkdown(`❌ **Business Card Processing Error**\n\n${errorMessage}`),
            parse_mode: 'MarkdownV2',
        });
    } catch (error: any) {
        console.error('❌ Failed to send Telegram error notification:', error.message);
    }
} 