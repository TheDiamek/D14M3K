require("dotenv").config();

const fs = require("fs");
const express = require("express");

const app = express();

app.get("/", (requestAnimationFrame, res) => {
    res.send("Bot is alive and running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const TOKEN = process.env.TOKEN;

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

// Create a new Discord client with the correct intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Needed to work with guilds (servers)
        GatewayIntentBits.GuildMessages, // Needed to read messages in guilds
        GatewayIntentBits.MessageContent, // Needed to read message content
        GatewayIntentBits.GuildMembers, // Needed to manage roles/members
    ],
});

const channelIds = {
    cheese_talk: "1292197662048915486",
    aoh_fun_facts: "1295675654989414431",
};

const assignableRolesId = {
    cheese_lord: "1294048641119551529",
};

let configuration = {
    FunFactsEnabled: true,
};

const ONE_DAY = 86400000;
const FUN_FACT_RELEASE_TIME = {
    hour: 20 - 2, //timezone offset
    minute: 42,
};

let funFactsObject = {};

const loadFunFacts = () => {
    try {
        const readFunFacts = fs.readFileSync("./data/funFacts.json");
        const funFactsRead = JSON.parse(readFunFacts);
        funFactsObject["FunFacts"] = funFactsRead["FunFactList"];

        const funFactCounter = fs.readFileSync("./data/funFactCount.json");

        const counterObj = JSON.parse(funFactCounter);
        funFactsObject["Count"] = Number(counterObj["Count"]);
        
    } catch (exception) {
        configuration["FunFactsEnabled"] = false;
        console.error(exception);
    }
};

const saveFunFacts = () => {
    fs.writeFileSync(
        "./data/funFactCount.json",
        "{ 'Count': " + funFactsObject["Count"] + " }",
    );
};

async function sendFunFact() {
    const channel = client.channels.cache.get(channelIds["aoh_fun_facts"]);

    console.log(funFactsObject["Count"]);

    const exampleEmbed = new EmbedBuilder()
        .setColor(0x0a5bf5)
        .setTitle("Age of History Fun Fact")
        .setDescription(funFactsObject["FunFacts"][funFactsObject["Count"]])
        .setThumbnail(
            "https://media.discordapp.net/attachments/1288220461460750446/1296176562437099620/OIP.png?ex=671155fe&is=6710047e&hm=a7802dabbcd585227f91c99b98508717df36e0fae41589304b3b027205eca4c9&=&format=webp&quality=lossless",
        );

    const sentEmbeddedMsg = await channel.send({ embeds: [exampleEmbed] });
    await sentEmbeddedMsg.react('🤯');
    
    funFactsObject["Count"] =
        ++funFactsObject["Count"] % funFactsObject["FunFacts"].length;
    console.log(funFactsObject["Count"]);
};

const manageFunFacts = () => {
    console.log("prepared");
    sendFunFact();
    setInterval(sendFunFact, ONE_DAY);
};

const loadMessageCounts = () => {
    const readData = fs.readFileSync(MESSAGE_COUNT_JSON_FILE_PATH);
    messageCountObject = JSON.parse(readData);
};

const saveMessageCounts = () => {
    const jsonData = JSON.stringify(messageCountObject, null, 2); // 'null, 2' makes it pretty-printed

    // Write the JSON data to a file (synchronous method)
    fs.writeFileSync(MESSAGE_COUNT_JSON_FILE_PATH, jsonData);
};

const loadData = () => {
    loadFunFacts();
    loadMessageCounts();
    console.log("Data loaded!");
};

const saveData = () => {
    saveFunFacts();
    saveMessageCounts();
};

const callAtSpecificHour = (hour, minute, func) => {
    const now = new Date();
    const desiredTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0,
        0,
    );
    let timeDiff = desiredTime.getTime() - now.getTime();

    if (timeDiff < 0) {
        desiredTime.setDate(desiredTime.getDate() + 1);
        timeDiff = desiredTime.getTime() - now.getTime();
    }

    console.log("function called in: " + timeDiff);

    setTimeout(func, timeDiff);
};

const MESSAGE_COUNT_JSON_FILE_PATH = "./data/messageCounts.json";
const MESSAGE_COUNT_REQUIRED = 10;

let messageCountObject = {};

const handleShutdown = () => {
    saveData();
    process.exit(0);
};

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    loadData();

    console.log(configuration.FunFactsEnabled);

    if (configuration.FunFactsEnabled)
        callAtSpecificHour(
            FUN_FACT_RELEASE_TIME.hour,
            FUN_FACT_RELEASE_TIME.minute,
            manageFunFacts,
        );
});

client.on("messageCreate", async (message) => {
    // Check if the message was sent in the specific channel, is NOT from any bot, and comes from a guild (server)
    if (
        message.channel.id === channelIds["cheese_talk"] &&
        !message.author.bot
    ) {
        const member = message.guild.members.cache.get(message.author.id);

        if (!member.roles.cache.has(assignableRolesId["cheese_lord"])) {
            if (!messageCountObject[member.id]) {
                messageCountObject[member.id] = 1;
                return;
            }

            messageCountObject[member.id]++;

            if (messageCountObject[member.id] < MESSAGE_COUNT_REQUIRED) return;

            try {
                await member.roles.add(assignableRolesId["cheese_lord"]);
                delete messageCountObject[member.id];
                member.send(
                    `Hi ${member.displayName}! You might wanna check your roles...`,
                );
            } catch (error) {
                console.error(
                    `Failed to assign role to ${message.author.tag}:`,
                    error,
                );
            }
        }
    }
});

process.on("SIGINT", handleShutdown); // Catches Ctrl+C (interrupt signal)
process.on("SIGTERM", handleShutdown);
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    saveData(); // Save data before exiting
    process.exit(1);
});

client.login(TOKEN);
