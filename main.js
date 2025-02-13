const { Client, GatewayIntentBits, PermissionsBitField, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const spamBlocker = require('./spam-blocker');
const serverStats = require('./server');
const hangmanGame = require('./hangman');
const activeGames = new Map();
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 25; 



const prefixFilePath = path.join(__dirname, 'prefix.json');
let prefix = "x!";
let spamProtectionEnabled = true;

if (fs.existsSync(prefixFilePath)) {
    const data = fs.readFileSync(prefixFilePath);
    const json = JSON.parse(data);
    if (json.prefix) {
        prefix = json.prefix;
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
    spamBlocker(client, spamProtectionEnabled);
    serverStats(client, prefix);
});

client.on('guildMemberAdd', async (member) => {
    const channelId = "1260679025429450853";
    const gelengiden = member.guild.channels.cache.get(channelId);
    if (gelengiden) {
        gelengiden.send(`Aramıza Hoş Geldin, ${member.user.username}!`);
    } else {
        console.log("❌ Gelen-Giden kanalı bulunamadı!");
    }
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    if (msg.content.startsWith(prefix + "hangman")) {
        hangmanGame.startGame(msg);
    }
    
    if (msg.content.startsWith(prefix + "adam-asmaca")) {
        return msg.reply("Adam Asmaca Başlatılıyor! Seni Yeneceğim!!!");
    }

    if (msg.content.startsWith(prefix + "prefix")) {
        const args = msg.content.split(" ");
        if (!args[1]) return msg.reply("❌ Yeni prefix belirtmelisin!");
        if (msg.author.id !== "1108122911375626270") {
            return msg.reply("❌ Bu komutu sadece sahibi kullanabilir!");
        }
        prefix = args[1];
        fs.writeFileSync(prefixFilePath, JSON.stringify({ prefix }, null, 2));
        return msg.reply(`✅ Prefix başarıyla değiştirildi: \`${prefix}\``);
    }

    if (msg.content.startsWith(prefix + "start-spam-blocker")) {
        if (spamProtectionEnabled) return msg.reply("✅ Spam engelleme zaten açık!");
        spamProtectionEnabled = true;
        spamBlocker(client, spamProtectionEnabled);
        return msg.reply("✅ Spam engelleme açıldı.");
    }

    client.on('messageCreate', message => {
        if (message.content === 'shutdown spam blocker') {
            if (typeof spamBlocker === 'function') {
                client.removeListener('messageCreate', spamBlocker);
                message.reply('✅ Spam Blocker devre dışı bırakıldı.');
            } else {
                message.reply('⚠ Spam Blocker zaten kapalı.');
            }
        }
    });
    
    if (msg.content.startsWith(prefix + "ban")) {
        if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return msg.reply("❌ Kullanıcıları yasaklama iznin yok!");
        }
        const user = msg.mentions.users.first();
        if (!user) return msg.reply("❌ Geçerli bir kullanıcı etiketlemelisin!");
        const member = msg.guild.members.cache.get(user.id);
        if (!member) return msg.reply("❌ Bu kullanıcı sunucuda bulunmuyor.");
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return msg.reply("❌ Yönetici rolündeki birini yasaklayamazsın.");
        }
        try {
            await member.ban({ reason: "Yasaklandı." });
            msg.reply(`✅ ${user.tag} başarıyla yasaklandı.`);
        } catch (err) {
            console.error(err);
            msg.reply("❌ Kullanıcıyı yasaklarken bir hata oluştu.");
        }
    }



    if (msg.content.startsWith(prefix + "Help")) {
        return msg.reply(`
**Eğlence Komutları:**
- \`${prefix}tahmin\` - Sayı tahmin oyunu başlatır.
- \`${prefix}hangman\` - Adam Asmaca Oyunu Başlatır.

**Yönetici Komutları:**
- \`${prefix}ban @kullanıcı\` - Bir kullanıcıyı yasaklar.
- \`${prefix}prefix [yeni prefix]\` - Prefix'i değiştirir.
- \`${prefix}shutdown\` - Botu kapatır.
- \`${prefix}start-spam-blocker\` - Spam Korumasını Açar
- \`${prefix}shutdown-spam-blocker\` - Spam Korumasını Kapatır

**Herkese Açık**
- \`${prefix}server\` - Sunucu Durumunu Gösterir
        `)};

    if (msg.content.startsWith(prefix + "tahmin")) {
        if (activeGames.has(msg.author.id)) {
            return msg.reply("❌ Zaten bir tahmin oyunu oynuyorsun!");
        }
        let attempts = 5;
        const numberToGuess = Math.floor(Math.random() * 100) + 1;
        msg.reply(`🎲 1-100 arasında bir sayı tuttum. Tahmin et! (${attempts} hakkın var)`);
        activeGames.set(msg.author.id, { attempts, numberToGuess });
        const filter = response => response.author.id === msg.author.id && !isNaN(response.content);
        const collector = msg.channel.createMessageCollector({ filter, time: 60000 });
        collector.on('collect', guessMsg => {
            const guess = parseInt(guessMsg.content);
            attempts--;
            if (guess === numberToGuess) {
                guessMsg.reply(`🎉 Doğru tahmin! Sayı: ${numberToGuess}`);
                collector.stop();
            } else {
                guessMsg.reply(`❌ Yanlış! ${guess < numberToGuess ? "Daha yüksek" : "Daha düşük"} bir sayı gir. (${attempts} hakkın kaldı)`);
            }
            if (attempts <= 0) {
                guessMsg.reply(`❌ Süren bitti! Sayı: ${numberToGuess}`);
                collector.stop();
            }
            if (attempts <= 0 || guess === numberToGuess) {
                activeGames.delete(msg.author.id);
            }
        });
        collector.on('end', (_, reason) => {
            if (reason === 'time') msg.reply("⏰ Süre doldu!");
            activeGames.delete(msg.author.id);
        });
    }
});

client.login("MTMzNzExNTI2MDU4NjU1NzU3NA.G08AFk.SA0x0C8RAd_cY1sq7BUq7ssnUT2KYOaIj7wAmI");
    