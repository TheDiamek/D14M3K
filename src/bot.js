require('dotenv').config();

const fs = require('fs');

//const { TOKEN } = process.env;
const TOKEN = process.env.TOKEN;

const { Client, GatewayIntentBits } = require('discord.js');

// Create a new Discord client with the correct intents
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,                 // Needed to work with guilds (servers)
        GatewayIntentBits.GuildMessages,          // Needed to read messages in guilds
        GatewayIntentBits.MessageContent,         // Needed to read message content
        GatewayIntentBits.GuildMembers            // Needed to manage roles/members
    ]
});

const MESSAGE_COUNT_JSON_FILE_PATH = './data/messageCounts.json';
const MESSAGE_COUNT_REQUIRED = 10;
let messageCountObject = {};

const targetChannelId = '1292197662048915486'; 

const roleIdToAssign = '1294048641119551529';      

const loadMessageCounts = () => {

    const readData = fs.readFileSync(MESSAGE_COUNT_JSON_FILE_PATH);
    messageCountObject = JSON.parse(readData);

};

const saveMessageCounts = () => {

    const jsonData = JSON.stringify(messageCountObject, null, 2);  // 'null, 2' makes it pretty-printed

    // Write the JSON data to a file (synchronous method)
    fs.writeFileSync(MESSAGE_COUNT_JSON_FILE_PATH, jsonData);

};

const handleShutdown = () => {

    saveMessageCounts();
    process.exit(0);

};



client.once('ready', () => {

    console.log(`Logged in as ${client.user.tag}`);
    loadMessageCounts();

    
});

client.on('messageCreate', async (message) => {
    // Check if the message was sent in the specific channel, is NOT from any bot, and comes from a guild (server)
    if (message.channel.id === targetChannelId && !message.author.bot) {

        const member = message.guild.members.cache.get(message.author.id);
        
        if (!member.roles.cache.has(roleIdToAssign)) {

            if (!messageCountObject[member.id]) {

                messageCountObject[member.id] = 1;
                return;

            }

            messageCountObject[member.id]++;
            
            if (messageCountObject[member.id] < MESSAGE_COUNT_REQUIRED) 
                return;

            try {

                await member.roles.add(roleIdToAssign);
                delete messageCountObject[member.id];
                member.send(`Hi ${member.displayName}! You might wanna check your roles...`);

            } catch (error) {

                console.error(`Failed to assign role to ${message.author.tag}:`, error);

            }
        }
    }
});

process.on('SIGINT', handleShutdown);  // Catches Ctrl+C (interrupt signal)
process.on('SIGTERM', handleShutdown);
process.on('uncaughtException', (error) => {

    console.error('Uncaught Exception:', error);
    saveMessageCounts();  // Save data before exiting
    process.exit(1);

});


client.login(TOKEN);
