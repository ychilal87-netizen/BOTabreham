const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');
require('dotenv').config();

// 1. Firebase Admin Initialization (ከስህተት የጸዳ አጀማመር)
const serviceAccountData = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount;

try {
    if (!serviceAccountData) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT variable is missing in environment settings!");
    }

    // መረጃው JSON መሆኑን ወይም አለመሆኑን ቼክ ያደርጋል
    if (serviceAccountData.trim().startsWith('{')) {
        serviceAccount = JSON.parse(serviceAccountData);
    } else {
        throw new Error("FIREBASE_SERVICE_ACCOUNT is not a valid JSON string!");
    }

    // የ Private Key ምልክቶችን ለ Render ማስተካከል
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://evpapp-354e3-default-rtdb.firebaseio.com"
    });
    console.log("✅ Firebase Admin በስኬት ተገናኝቷል!");
} catch (error) {
    console.error("❌ የ Firebase አጀማመር ስህተት:", error.message);
    process.exit(1); 
}

const db = admin.database();
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8708523632; 
const GROUP_ID = "-1003755076161";

let activeBonuses = {}; 

// --- የቦቱ ተግባራት (Handlers) ---

// ቦቱ ሲጀመር
bot.start((ctx) => {
    if (ctx.chat.type === 'private') {
        ctx.reply(`እንኳን ወደ EV-PROMOTION በደህና መጡ! 👋\n\nለመቀጠል እባክዎ የአፑን 'Invitation Code' (የግብዣ ኮድ) ያስገቡ።`);
    }
});

// የግብዣ ኮድ ምዝገባ (VIP 1+ ቼክ)
bot.on('text', async (ctx) => {
    if (ctx.chat.type !== 'private' || ctx.from.id === ADMIN_ID) return;
    const inviteCode = ctx.message.text.trim();

    try {
        const snapshot = await db.ref('users').orderByChild('inviteCode').equalTo(inviteCode).once('value');
        const userData = snapshot.val();

        if (!userData) return ctx.reply("❌ የተሳሳተ ኮድ ነው! እባክዎ በትክክል ያስገቡ።");

        const userKey = Object.keys(userData)[0];
        const user = userData[userKey];

        if (!user.vipLevel || user.vipLevel < 1) {
            return ctx.reply("⚠️ VIP 1 ጀምሮ አባል ካልሆኑ ቦነስ አይሳተፉም!");
        }

        await db.ref(`users/${userKey}`).update({ telegram_id: ctx.from.id });
        ctx.reply(`✅ ተረጋግጧል! የግብዣ ኮድ #${inviteCode} አሁን ለቦነስ ዝግጁ ነው።`);
    } catch (e) { 
        console.error(e);
        ctx.reply("ስህተት ተከስቷል!"); 
    }
});

// ቦነስ መልቀቂያ (3 ዙር 10-10-10)
bot.command('drop_bonus', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    for (let i = 1; i <= 3; i++) {
        const bonusId = `bonus_${Date.now()}_${i}`;
        activeBonuses[bonusId] = { remainingSlots: 10, claimedBy: [], maxAmount: 15 };

        await bot.telegram.sendMessage(GROUP_ID, 
            `🎁 **የVIP ቦነስ ግብዣ (ዙር ${i})** 🎁\n\n` +
            `🔹 ለ 10 ሰዎች የተዘጋጀ (Random 1-15 ETB)\n` +
            `🔹 VIP 1 እና ከዚያ በላይ ብቻ\n\n` +
            `ለመቀበል **Claim Bonus** የሚለውን ይጫኑ! 👇`, 
            {
                reply_markup: {
                    inline_keyboard: [[{ text: "💰 Claim Bonus", callback_data: bonusId }]]
                }
            }
        );

        // በየዙሩ 3 ሰከንድ መጠበቅ
        await new Promise(r => setTimeout(r, 3000));
    }
});

// የክሌይም አሰራር
bot.on('callback_query', async (ctx) => {
    const bonusId = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    if (!activeBonuses[bonusId] || activeBonuses[bonusId].remainingSlots <= 0) {
        return ctx.answerCbQuery("ቦነሱ አልቋል!");
    }

    const bonus = activeBonuses[bonusId];
    if (bonus.claimedBy.includes(userId)) {
        return ctx.answerCbQuery("በዚህ ዙር ወስደዋል!");
    }

    try {
        const snapshot = await db.ref('users').orderByChild('telegram_id').equalTo(userId).once('value');
        const userData = snapshot.val();

        if (!userData) {
            return ctx.answerCbQuery("መጀመሪያ ቦቱ ላይ ገብተው የግብዣ ኮድዎን ያስመዝግቡ!", { show_alert: true });
        }

        const userKey = Object.keys(userData)[0];
        const user = userData[userKey];

        if (user.vipLevel < 1) {
            return ctx.answerCbQuery("VIP 1 ጀምሮ አባል ካልሆኑ ቦነስ አይሳተፉም!", { show_alert: true });
        }

        let amount = Math.floor(Math.random() * bonus.maxAmount) + 1;

        // በዳታቤዙ ላይ ባላንስ መጨመር
        await db.ref(`users/${userKey}`).transaction((current) => {
            if (current) {
                current.balance = (current.balance || 0) + amount;
            }
            return current;
        });

        bonus.remainingSlots -= 1;
        bonus.claimedBy.push(userId);

        ctx.answerCbQuery(`እንኳን ደስ አለዎት! ${amount} ETB አግኝተዋል!`);
        bot.telegram.sendMessage(GROUP_ID, 
            `🎊 **ቦነስ ተረክበዋል!**\n` +
            `🔑 **Invitation Code:** \`${user.inviteCode}\`\n` +
            `💰 **መጠን:** +${amount} ETB\n` +
            `🌟 **ደረጃ:** VIP ${user.vipLevel}`
        );
    } catch (e) { 
        console.error(e);
        ctx.answerCbQuery("ስህተት ተከስቷል!"); 
    }
});

// ቦቱን ማስጀመር
bot.launch().then(() => {
    console.log("🚀 Telegram Bot ስራ ጀምሯል።");
});

// ስህተት ሲፈጠር ቦቱ እንዳይቆም
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
