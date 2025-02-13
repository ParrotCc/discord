const words = ["Bot", "insan","araba","bilgisayar","oyun","piskoloji","felsefe","astronomi","elektronik","teknoloji","şehir","bilim","elma","akıl","internet"];
let activeGames = {}; 

async function startGame(msg) {
    if (activeGames[msg.author.id]) {
        return msg.reply("Zaten bir oyununuz var!");
    }

    let word = words[Math.floor(Math.random() * words.length)];
    let guessedLetters = [];
    let wrongGuesses = 0;
    let maxWrongGuesses = 6;


    activeGames[msg.author.id] = {
        word: word,
        guessedLetters: guessedLetters,
        wrongGuesses: wrongGuesses,
        maxWrongGuesses: maxWrongGuesses,
        gameMessage: null,
    };

    let gameMessage = await msg.reply("Adam asmaca oyunu başlatıldı! Kelimenin harfleri: " + "_".repeat(word.length) + "\nTahmin yapmak için harf girin!");

    activeGames[msg.author.id].gameMessage = gameMessage;

    const filter = m => m.author.id === msg.author.id && m.content.length === 1 && /[a-zA-Z]/.test(m.content);
    const collector = msg.channel.createMessageCollector({ filter, time: 60000 });

    collector.on('collect', async (guessMsg) => {
        let guess = guessMsg.content.toLowerCase();
        let game = activeGames[msg.author.id];

  
        if (game.word.includes(guess)) {
            game.guessedLetters.push(guess);
            let currentWord = game.word.split("").map(letter => (game.guessedLetters.includes(letter) ? letter : "_")).join("");

            await game.gameMessage.edit(`Kelimenin harfleri: ${currentWord}`);
            
          
            if (!currentWord.includes("_")) {
                await game.gameMessage.edit(`Tebrikler! Kelimeyi doğru tahmin ettin: ${game.word}`);
                collector.stop();
            }
        } else {
            game.wrongGuesses++;
            let remainingGuesses = game.maxWrongGuesses - game.wrongGuesses;
            await game.gameMessage.edit(`Yanlış tahmin! Kalan tahmin haklarınız: ${remainingGuesses}`);

            if (game.wrongGuesses >= game.maxWrongGuesses) {
                await game.gameMessage.edit(`Oyun bitti! Kaybettin. Kelime: ${game.word}`);
                collector.stop();
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            game.gameMessage.edit(`Zaman doldu! Kelime: ${game.word}`);
        }
        delete activeGames[msg.author.id]; 
    });
}

module.exports = { startGame };

console.log("HangMan Bağlandı")
