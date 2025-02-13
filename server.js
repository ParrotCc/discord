const { EmbedBuilder } = require('discord.js');
console.log("✅ Server.Js Bağlandı")

module.exports = (client, prefix) => {
    client.on('messageCreate', async (msg) => {
        if (msg.author.bot) return; 

        if (!msg.content.startsWith(prefix + "server")) return;

        const args = msg.content.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (command === "server") {
            const { guild } = msg;
            const totalMembers = guild.memberCount; 
            const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
            const textChannels = guild.channels.cache.filter(ch => ch.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(ch => ch.type === 2).size;
            const roleCount = guild.roles.cache.size; 
            const owner = await guild.fetchOwner();
            const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${guild.name} Sunucu İstatistikleri`)
                .setColor("Random")
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: "👑 Sunucu Sahibi", value: `${owner.user.tag} (${owner.id})`, inline: true },
                    { name: "📅 Oluşturulma Tarihi", value: createdAt, inline: true },
                    { name: "👥 Üye Sayısı", value: `Toplam: ${totalMembers}\nÇevrimiçi: ${onlineMembers}`, inline: true },
                    { name: "📢 Kanal Sayısı", value: `Metin: ${textChannels}\nSesli: ${voiceChannels}`, inline: true },
                    { name: "🎭 Rol Sayısı", value: `${roleCount}`, inline: true }
                )
                .setFooter({ text: `ID: ${guild.id}` });

            return msg.reply({ embeds: [embed] });
        }
    });
};
