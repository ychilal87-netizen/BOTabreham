const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// 1. Firebase Configuration (በቀጥታ እዚህ ተካቷል)
const firebaseConfig = {
  "type": "service_account",
  "project_id": "evpapp-354e3",
  "private_key_id": "a14d48b8130418cc50a60895ab02ae9bc9069f46",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDX5ycR+ltPRXeN\nBy8PkJM2rpT+vk7YdLQPMrl0BGkCE0LzXiCLGzP4ANqmRaomXBNOH96QmOmSEwje\n3VutJzip0eVBtMnMae5BRyFg9SNcCmXMRnwSrV2Q/yOAX36MGXpkbCWjq/rkVCr4\nB6EuX2JB2GC8MirgV6Ll591hyD/UoASUHRqHDQJO9UFHsJD/H9RK2KqNB6GstlmG\n/J8N11YGoWebVd9sWNKg80TlBQMXji/lElnaKiDXrK+Pac9GjIW4f73oBf47FPQq\n9Hj6aBLf568uPVuMMcgfHulA4VBl3joQ8OpQEGpgw9yLnxpImkNIJ3NOfm4GGC4B\njIc/tQtzAgMBAAECggEABrmaVvrZ8/5DgmmPknkK4abbewrusKfQnTHG/JOC/bLs\nfoNobm3hhfS16+LyfgJkJDd2pWNiv6kHH6xrQXMu8BawEf3o/x2Vc6Y2hHO7GdzO\nP86PcazSsKZ+HV2kpdKVvfLV5F7f6dwRKzy1miFG74jacsm1puxoKbkxOFxFR2Lr\n8T5/gvLMOk31tEV4BkmXlNUfrlVXhonAJdAF/QYEcEQ00bejgIOFOZAVsmZ4MPhN\n1oGC+GdTau2AlxMVbpqhaqFfXIS9QW1K4aTgHXVae8JV/rvP6WwVW9V3naHUHryn\naDsloIMGK93GuS9ylpKeWHWqBIiHtSpKhc5KnF2cRQKBgQD4VO0eauQDwA0oMLK2\nBzxnyQilqGxcOljihdJwwsM/KH1nz8/aYtveXXRF/mnw5eJrbXc/C7i4+XMtJaKo\vu0+tqEdpd79acpr/Rhutw/QIuGY5ULEKO9xzsOjPVHK/gZWc4K5wE3NRQTCwJfd\n1zIIdlDXjvf7nNQXvwAlnRJVRwKBgQDekeANYphu7ABaylagcDjM1BdHAzPohfTf\nq0LPfAg7DKki6gTrgZMCHWJJc9WD/bL01+65b1omCR+j25VItFnUO2t+7TO+WA4R\ngtPfd08FeMEgtLoaD5OAn69rQ4h6sjMs1DfAf+TjqtMlaRb0/guPh7WiMtJiMl8k\njFxU/txedQKBgQCg9AKAHY3N9HNSokWif4wiRIVrQX+CQ3sKzuu3lDSSQf8OAv5Y\nMI0LUg0jtKMbtRQMxvVsEn/WvC9vip4juyPv6tUAb1rZavD9Dxz/3XzNTV5lB+s/\nUrznSbk5m2vhIsYe0F1hYYfLzLkqNUP5UBooq+73171ZAqvg/DXvKyAPzwKBgQCS\nEOYborMrSJLLArNrQ3rjYeWM4xsz5IXaLEkCZgH4zsxJb4+fB0B1SNdyISTlJKBH\nc1bmN5/QCnjLTpZgSowRbpWTjRRCPQOulk95/pDLpH4KetEPvV0uMp4rJPzymPRg\n3T1hhg2vJDLCAH/idL8diRC4y+WqMCikkcEevsvc6QKBgQCev7A1R5yFwV4Kf7je\n6kUgi9PMvwWZDfbkRN1CNzFvuWsBG0Y4KB36jtDMiZpKqU4S/0ikjXwhzEBv6nkO\nY75mSKVo24Ok7Y0sJMdrKM+zX6ZL5I5NMMhgs71ByBKtYntUMu/Fm6VDw5ryPsC7\nrw/uzrGm0XyAcG/C7s6Peq8hsg==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@evpapp-354e3.iam.gserviceaccount.com"
};

// 2. Firebase አጀማመር
try {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: "https://evpapp-354e3-default-rtdb.firebaseio.com"
    });
    console.log("✅ Firebase Admin በስኬት ተገናኝቷል!");
} catch (error) {
    console.error("❌ የ Firebase ስህተት:", error.message);
}

const db = admin.database();
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8708523632; 
const GROUP_ID = "-1003755076161";
let activeBonuses = {}; 

// --- የቦቱ ስራዎች ---

bot.start((ctx) => {
    if (ctx.chat.type === 'private') {
        ctx.reply(`እንኳን ወደ EV-PROMOTION በደህና መጡ! 👋\n\nለመቀጠል እባክዎ የአፑን 'Invitation Code' (የግብዣ ኮድ) ያስገቡ።`);
    }
});

bot.on('text', async (ctx) => {
    if (ctx.chat.type !== 'private' || ctx.from.id === ADMIN_ID) return;
    const inviteCode = ctx.message.text.trim();
    try {
        const snapshot = await db.ref('users').orderByChild('inviteCode').equalTo(inviteCode).once('value');
        const userData = snapshot.val();
        if (!userData) return ctx.reply("❌ የተሳሳተ ኮድ ነው! እባክዎ በትክክል ያስገቡ።");
        const userKey = Object.keys(userData)[0];
        const user = userData[userKey];
        if (!user.vipLevel || user.vipLevel < 1) return ctx.reply("⚠️ VIP 1 ጀምሮ አባል ካልሆኑ ቦነስ አይሳተፉም!");
        await db.ref(`users/${userKey}`).update({ telegram_id: ctx.from.id });
        ctx.reply(`✅ ተረጋግጧል! የግብዣ ኮድ #${inviteCode} አሁን ለቦነስ ዝግጁ ነው።`);
    } catch (e) { console.error(e); ctx.reply("ስህተት ተከስቷል!"); }
});

bot.command('drop_bonus', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    for (let i = 1; i <= 3; i++) {
        const bonusId = `bonus_${Date.now()}_${i}`;
        activeBonuses[bonusId] = { remainingSlots: 10, claimedBy: [], maxAmount: 15 };
        await bot.telegram.sendMessage(GROUP_ID, 
            `🎁 **የVIP ቦነስ ግብዣ (ዙር ${i})** 🎁\n\n🔹 ለ 10 ሰዎች የተዘጋጀ (Random 1-15 ETB)\n🔹 VIP 1 እና ከዚያ በላይ ብቻ\n\nለመቀበል **Claim Bonus** የሚለውን ይጫኑ! 👇`, 
            { reply_markup: { inline_keyboard: [[{ text: "💰 Claim Bonus", callback_data: bonusId }]] } }
        );
        await new Promise(r => setTimeout(r, 3000));
    }
});

bot.on('callback_query', async (ctx) => {
    const bonusId = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    if (!activeBonuses[bonusId] || activeBonuses[bonusId].remainingSlots <= 0) return ctx.answerCbQuery("ቦነሱ አልቋል!");
    const bonus = activeBonuses[bonusId];
    if (bonus.claimedBy.includes(userId)) return ctx.answerCbQuery("በዚህ ዙር ወስደዋል!");
    try {
        const snapshot = await db.ref('users').orderByChild('telegram_id').equalTo(userId).once('value');
        const userData = snapshot.val();
        if (!userData) return ctx.answerCbQuery("መጀመሪያ ቦቱ ላይ ገብተው የግብዣ ኮድዎን ያስመዝግቡ!", { show_alert: true });
        const userKey = Object.keys(userData)[0];
        const user = userData[userKey];
        if (user.vipLevel < 1) return ctx.answerCbQuery("VIP 1 ጀምሮ አባል ካልሆኑ ቦነስ አይሳተፉም!", { show_alert: true });
        let amount = Math.floor(Math.random() * bonus.maxAmount) + 1;
        await db.ref(`users/${userKey}`).transaction((current) => {
            if (current) current.balance = (current.balance || 0) + amount;
            return current;
        });
        bonus.remainingSlots -= 1;
        bonus.claimedBy.push(userId);
        ctx.answerCbQuery(`እንኳን ደስ አለዎት! ${amount} ETB አግኝተዋል!`);
        bot.telegram.sendMessage(GROUP_ID, `🎊 **ቦነስ ተረክበዋል!**\n🔑 **Invitation Code:** \`${user.inviteCode}\`\n💰 **መጠን:** +${amount} ETB\n🌟 **ደረጃ:** VIP ${user.vipLevel}`);
    } catch (e) { console.error(e); ctx.answerCbQuery("ስህተት ተከስቷል!"); }
});

bot.launch().then(() => console.log("🚀 Telegram Bot ስራ ጀምሯል!"));
