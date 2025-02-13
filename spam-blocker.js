const { PermissionsBitField } = require('discord.js');
console.log("Spam-Blocker.Js Bağlandı");

let spamProtectionEnabled = true;
const spamMap = new Map();
const spamLimit = 6;
const spamInterval = 3000;
const muteDuration = 15000;

module.exports = (client, prefix) => {
    client.on('messageCreate', async (msg) => {
        if (msg.author.bot || !msg.guild) return;

        if (msg.content.startsWith(prefix + "start-spam-blocker")) {
            spamProtectionEnabled = true;
            return msg.reply("✅ Spam engelleme sistemi açıldı.");
        }

        if (msg.content.startsWith(prefix + "shutdown-spam-blocker")) {
            spamProtectionEnabled = false;
            return msg.reply("❌ Spam engelleme sistemi kapatıldı.");
        }

        if (!spamProtectionEnabled) return;

        const userId = msg.author.id;
        const now = Date.now();

        if (!spamMap.has(userId)) {
            spamMap.set(userId, []);
        }

        const timestamps = spamMap.get(userId);
        timestamps.push(now);

        while (timestamps.length > 0 && now - timestamps[0] > spamInterval) {
            timestamps.shift();
        }

        if (timestamps.length >= spamLimit) {
            let mutedRole = msg.guild.roles.cache.find(role => role.name === "Muted");

            if (!mutedRole) {
                try {
                    // "Muted" rolü yoksa oluşturuluyor
                    mutedRole = await msg.guild.roles.create({
                        name: "Muted",
                        permissions: [], // Hiçbir izni yok
                        reason: "Spam koruması için oluşturuldu"
                    });

                    // "Muted" rolü, kanal bazında da engelleniyor
                    msg.guild.channels.cache.forEach(async (channel) => {
                        if (channel.type === 0) { // Eğer kanal metin kanalına aitse
                            await channel.permissionOverwrites.create(mutedRole, {
                                [PermissionsBitField.Flags.SendMessages]: false
                            });
                        }
                    });

                    console.log("Muted rolü başarıyla oluşturuldu.");
                } catch (err) {
                    console.error("Rol oluşturulurken hata oluştu: ", err);
                    return msg.reply("❌ Muted rolü oluşturulamadı!");
                }
            }

            // Eğer oyuncu susturulmamışsa, susturuluyor
            if (msg.member && mutedRole) {
                try {
                    await msg.member.roles.add(mutedRole);
                    msg.reply("❌ Spam yaptığın için susturuldun!");

                    // Susturmayı kaldırma işlemi
                    setTimeout(async () => {
                        await msg.member.roles.remove(mutedRole);
                        msg.reply("✅ Susturulman kaldırıldı.");
                    }, muteDuration);
                } catch (err) {
                    console.error("Rol eklenirken hata oluştu: ", err);
                    msg.reply("❌ Muted rolü eklenirken bir sorun oluştu!");
                }
            }
        }
    });
};
