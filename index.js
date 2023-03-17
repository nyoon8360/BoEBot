require('dotenv').config();
const { Client, IntentsBitField, ButtonStyle, time, ActionRowBuilder, ButtonBuilder, parseEmoji, inlineCode, bold, underscore, Options, Sweepers, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
//import { setTimeout } from 'timers/promises';

/*
axios for easy HTTP promises with node.js
dotenv for loading environment variables from .env file
fs for reading/writing/editing json files
*/

/*
database.json format:

{
    "users": [
        {
            "tag":"string with discord user's tag i.e 'inspirasian#1234'",
            "balance": 0,
            "lastAwarded": 1678310667 this will be a number using epoch unix timestamp in seconds,
            "inventory": [
                "itemname": 0,
                "itemname2": 2
            ],
            "equiped": {
                "head":
                ""
            }
        }
    ],
    "msgLeaderboard": [
        {
            "msgId": "123215422542",
        }
    ],
    "msgLeaderboardFloor": 0
}
*/

// NOTE: Make sure to update intents if new events not in current intents are needed to be listened to
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildScheduledEvents,
        IntentsBitField.Flags.MessageContent
    ],
    sweepers: {
        ...Options.DefaultSweeperSettings,
		messages: {
			interval: 3600, // Sweep message cache every hour
			lifetime: 3780,	// Remove messages older than 1 hour 3 minutes.
		}
    }
});

var workingData = {}; //In-memory data

const reactCooldown = config.reactCooldown; //how long users must wait in between awarding edbucks in seconds
const msgExpiration = config.msgExpiration; //how long a message can be awarded edbucks for in seconds
const reactAward = config.reactAward; //how many edbucks awarded for reactions
const treasureLR = config.treasureLowerRange;
const treasureUR = config.treasureUpperRange;
const treasureCDLR = config.treasureCooldownLowerRange;
const treasureCDUR = config.treasureCooldownUpperRange;
const msgLeaderboardLimit = config.msgLeaderboardLimit;
const currencyEmojiName = config.currencyEmojiName;
const botAdmins = config.admins;
const saveInterval = config.saveInterval;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    //TODO: this shit doesnt work to set bot status and activity lmao
    client.user.setStatus('available');
    client.user.setActivity('Use \'>help\' to see my commands!', {
        type: "LISTENING"
    });

    //LOAD data from json database and assign it to workingData var
    client.guilds.cache.map(guild => guild.id).forEach((guildId) => {
        try {
            if (!fs.existsSync("./database" + guildId + ".json")) {
                //if database file for this guild doesnt exist then make the file and assign the new data to workingData var
                newData = {
                    users:[],
                    activeMenuId: "",
                    msgLeaderboard: [],
                    msgLeaderboardFloor: 0
                }

                fs.writeFileSync("./database" + guildId + ".json", JSON.stringify(newData, null, 2));

                workingData[guildId] = newData;
            } else {
                //read data from json database file and assign it to workingData var synchronously

                workingData[guildId] = JSON.parse(fs.readFileSync("./database" + guildId + ".json"));
            }
        } catch(error) {
            console.log(error);
        }

        
        //add entries for any users in guilds that are not in database
        client.guilds.resolve(guildId).members.fetch().then(memberManager => {
            let existingArray = [];
            let guildUsersArray = [];
    
            workingData[guildId].users.forEach((eUser) => {
                existingArray.push(eUser.tag);
            });

            memberManager.forEach((gMember) => {
                guildUsersArray.push(gMember.user.tag);
            });

            guildUsersArray.filter(user => !existingArray.includes(user)).forEach((newUser) => {
                console.log(newUser);
                workingData[guildId].users.push(getNewUserJSON(newUser));
            });

            fs.writeFileSync('./database' + guildId + ".json", JSON.stringify(workingData[guildId], null, 2));
        }).catch(console.error);
        
    });

    setInterval(() => {
        saveData();
        console.log((Date.now()/1000) + " (Epoch Seconds Timestamp): Autosave Complete!");
    }, saveInterval * 1000);

    console.log(`${client.user.tag} is ready!`);
});

//event listener for messages mainly used for admin commands
client.on('messageCreate', (message) => {
    if (!message.content.charAt(0) == '>') return;
    if (message.author.bot) return;

    //if command sender is not a bot admin then do not process command
    if (!botAdmins.includes(message.author.tag)) return;

    switch(message.content.substring(1)) {
        case "spawnmenu":

            message.channel.send(openMenu()).then(msg => {
                workingData[message.guildId].activeMenuId = msg.id;
            });

            break;

        case "save":
            saveData();
            message.channel.send({
                content: "Manual Save Requested"
            });
            break;
        
        case "shutdown":
            saveData(true);
            message.channel.send({
                content: "Bot has been manually shut down for this server."
            }).then(() => {
                console.log("Manual shutdown for server: " + message.guild.name);
                client.destroy();
            });
            break;
    }
});

client.on('messageReactionAdd', (messageReaction, user) => {
    //base system for awarding edbucks to users whose msgs get edbuck reactions
    if (messageReaction.emoji.name != 'edbuck') return;
    if (!messageReaction.message.guildId) return;

    //do a time check for the reactor
    let storedUserData = workingData[messageReaction.message.guildId].users.find(obj => {
        return obj.tag == user.tag;
    })

    let currTime = Math.floor(Date.now() / 1000);

    //TODO: check to make sure reactor and recipient are NOT the same person so people cant award themselves edbucks

    if (currTime - storedUserData.lastAwarded >= reactCooldown) {

        //do a time check for the reacted to message
        if (currTime - messageReaction.message.createdTimestamp <= msgExpiration) {
            //find recipient user's data object in working data var
            let recipient = workingData[messageReaction.message.guildId].users.find(obj => {
                return obj.tag == messageReaction.message.author.tag;
            });

            //award recipient edbucks
            recipient.balance += reactAward;

            //update lastAwarded parameter of the reactor to the current time 
            storedUserData.lastAwarded = Math.floor(Date.now() / 1000);

            //update fun stats
            storedUserData.fStatReactionsAwarded += 1;
            recipient.fStatReactionsReceived += 1;

            //check and update msg leaderboard
            let messageScore = messageReaction.message.reactions.cache.find(obj => {
                return obj.emoji.name == currencyEmojiName;
            }).count;

            //if the message's edbuck reaction count is greater than or equal to the current leaderboard floor then update leaderboard
            if (messageScore >= workingData[messageReaction.message.guildId].msgLeaderboardFloor) {
                let currLeaderboard = workingData[messageReaction.message.guildId].msgLeaderboard;

                let messageSnippet = (messageReaction.message.embeds.length || messageReaction.message.attachments.size) ? "MEDIA POST" : messageReaction.message.content.substring(0, 20);

                //Check if current message is already on leaderboard and if so then remove it from the leaderboard before processing where to update its position
                let dupeIndex = currLeaderboard.findIndex((entry) => {
                    entry.id == messageReaction.message.id;
                });

                if (dupeIndex > 0) {
                    currLeaderboard.splice(dupeIndex, 1);
                }

                if (currLeaderboard.length == 0) {
                    //if leaderboard is unpopulated, automatically push message to leaderboard
                    let leaderboardEntry = {
                        id: messageReaction.message.id,
                        score: messageScore,
                        snippet: messageSnippet,
                        author: messageReaction.message.author.tag,
                        channelid: messageReaction.message.channelId
                    };
                    currLeaderboard.push(leaderboardEntry);
                } else {
                    //if leaderboard is populated, iterate through leaderboard to check if current message has
                    //higher or equal score to any of the entries and replace if so
                    let replaceIndex = msgLeaderboardLimit;

                    for (i in currLeaderboard) {
                        if (messageScore >= currLeaderboard[i].score) {
                            replaceIndex = i;
                            break;
                        }
                    }

                    if (replaceIndex < msgLeaderboardLimit) {
                        let leaderboardEntry = {
                            id: messageReaction.message.id,
                            score: messageScore,
                            snippet: messageSnippet,
                            author: messageReaction.message.author.tag,
                            channelid: messageReaction.message.channelId
                        };
                        currLeaderboard.splice(replaceIndex, 0, leaderboardEntry);
                    }

                    //pop any excess entries above the leaderboard limit
                    while (currLeaderboard.length > msgLeaderboardLimit) currLeaderboard.pop();
                }
            }
        } else {
            // TODO: create a msg only seen by the reactor that says the message has expired
        }
    } else {
        //TODO: create a message to reactor saying that they cant awards edbucks yet
    }
});

//event listener for buttons
client.on('interactionCreate', async (interaction) => {
    //if interaction is not a button then return
    if (!interaction.isButton()) return;
    if (!interaction.guildId) return;

    //switch for code for different buttons
    switch(interaction.customId) {
        case "showstats":
            //show user stats
            let requester = workingData[interaction.guildId].users.find(obj => {
                return obj.tag == interaction.user.tag;
            });

            let lastAwarded = requester.lastAwarded > 0 ? time(requester.lastAwarded, "R") : inlineCode("Never");

            interaction.reply({
                content: `
${bold(underscore('YOUR STATS'))}
Edbuck Balance: ${requester.balance}
Last Edbuck Awarded: ${lastAwarded}
                `,
                ephemeral: true
            });

            break;
        
        case "openinv":
            break;

        case "findtreasure":
            //on click, award treasure, deactivate this button for a random amount of hours, and then reactivate
            let user = workingData[interaction.guildId].users.find(obj => {
                return obj.tag == interaction.user.tag;
            });

            let treasure = Math.floor(Math.random() * (treasureUR - treasureLR)) + treasureLR;
            user.balance += treasure;

            interaction.reply({
                content: `
You've found ${treasure} edbucks dropped by a wild Edwin!
All the local Edwins have been spooked back into hiding.
Check back again later to see if they've come back!
                `,
                ephemeral: true
            });

            interaction.channel.messages.fetch(workingData[interaction.guildId].activeMenuId).then(result => {
                //disable pick up edbucks button
                result.edit(openMenu(true));

                //set async function to wait until cooldown is over then re-enable button
                (async (menu) => {
                    let timeoutDuration = Math.floor(Math.random() * (treasureCDUR - treasureCDLR)) + treasureCDLR;
                    await setTimeout(() => menu.edit(openMenu()), timeoutDuration * 1000);
                })(result);
            });
            break;
        
        case "help":
            //TODO: implement help message

            interaction.reply({
                content:`
${bold(underscore('HELP'))}

${underscore('Main Sources Of Edbucks')}
1. Having people react to your messages with the :edbuck: emote.
2. Being the first person to click on the "Pick Up Edbucks" button when it's randomly enabled.
3. Winning minigames (WIP)

${underscore('Ways To Use Your Edbucks')}
1. Spend them on items in the store.
2. Trade them with other players through the "Trade" button.
3. Wager them against other players through the "Wager Edbucks" button.

${underscore('How To Use Purchased Items')}
1. Access your inventory through the "Open Inventory" button.
2. Click on the item you want to use.
3. Select the user you want to use the item on from the drop down menu.
                `,
                ephemeral: true
            })

            break;
        
        case "userleaderboard":
            let sortedLeaderboard = workingData[interaction.guildId].users.sort((a, b) => (a.balance > b.balance) ? -1 : 1);

            let leaderboard = "";

            sortedLeaderboard.forEach((user, index) => {
                leaderboard += "(" + (index + 1) + ") " + user.tag + ": " + user.balance + " EB \n"
            })

            interaction.reply({
                content: underscore(bold("LEADERBOARD")) + "\n" + leaderboard,
                ephemeral: true
            })

            break;
        
        case "msgleaderboard":
            //populate leaderboardEntries with embed fields holding info on the leaderboard messages
            let leaderboardEntries = [];

            for (i in workingData[interaction.guildId].msgLeaderboard) {
                //this is such a bad way to handle deleted messages xd but fuck it
                try {
                    await client.channels.cache.get(workingData[interaction.guildId].msgLeaderboard[i].channelid).messages.fetch(workingData[interaction.guildId].msgLeaderboard[i].id).then(message => {
                        leaderboardEntries.push(
                            {
                                name: underscore(workingData[interaction.guildId].msgLeaderboard[i].author + " (" + workingData[interaction.guildId].msgLeaderboard[i].score + " EB)"),
                                value: "[" + workingData[interaction.guildId].msgLeaderboard[i].snippet + "]" + "(" + message.url + ")"
                            }
                        );
                    });
                } catch(e) {
                    leaderboardEntries.push(
                        {
                            name: underscore(workingData[interaction.guildId].msgLeaderboard[i].author + " (" + workingData[interaction.guildId].msgLeaderboard[i].score + " EB)"),
                            value: workingData[interaction.guildId].msgLeaderboard[i].snippet + "(Original Message Deleted)"
                        }
                    );
                }
            }

            //create embed to send with ephemeral message
            let leaderboardEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(bold(underscore('MESSAGE LEADERBOARD')))
            .setDescription('The top earning messages sent in the server!')
            .addFields(leaderboardEntries);

            //send leaderboard message
            interaction.reply({
                embeds: [leaderboardEmbed],
                ephemeral: true
            });

            break;
    }
});

//on new guild user join, add entry to database if not already existing
client.on("guildMemberAdd", member => {
    let existingEntry = workingData[member.guild.id].users.find(entry => {
        entry.tag == member.user.tag
    });

    if (!existingEntry) {
        workingData[member.guild.id].users.push(getNewUserJSON(member.user.tag));
    }
});

//===================================================
//all client event listeners must be before this line
//===================================================
client.login(process.env.CLIENT_TOKEN);

function jsonReader(filePath, callBack) {
    fs.readFile(filePath, (error, fileData) => {
        //catch if readFile() returned an error
        if (error) {
            //if there is a callback, return callback(erorr).
            //if there is no callback, return callback which would be undefined
            return callBack && callBack(error);
        }

        try {
            //attempt to parse the file data passed from readFile
            const data = JSON.parse(fileData);
            return callBack && callBack(null, data);
        } catch (error) {
            return callBack && callBack(error);
        }
    });
}

//returns message composing the main menu of the discord bot
function openMenu(disabled) {
    let row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('showstats')
            .setLabel('Show Stats')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📜'),
        new ButtonBuilder()
            .setCustomId('openinv')
            .setLabel('Open Inventory')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📦'),
        new ButtonBuilder()
            .setCustomId('trade')
            .setLabel('Trade')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤝'),
        new ButtonBuilder()
            .setCustomId('findtreasure')
            .setLabel('Pick Up Edbucks')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💸')
            .setDisabled(disabled ? true : false)
    );

    let row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minigames')
            .setLabel('Minigames')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎮'),
        new ButtonBuilder()
            .setCustomId('challenge')
            .setLabel('Challenge')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🙌'),
        new ButtonBuilder()
            .setCustomId('wager')
            .setLabel('Wager Edbucks')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎲')
    );

    let row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('shop')
            .setLabel('Shop')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🛒')
    );

    let row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('userleaderboard')
            .setLabel('User Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏆'),
        new ButtonBuilder()
            .setCustomId('msgleaderboard')
            .setLabel('Message Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🥇'),
        new ButtonBuilder()
            .setCustomId('settings')
            .setLabel('Settings')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚙️'),
        new ButtonBuilder()
            .setCustomId('help')
            .setLabel('Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❓')
    );

    return {
        content: underscore(bold('MAIN MENU')),
        components: [row1, row2, row3, row4]
    };
}

//return object with default values for new users in database
function getNewUserJSON(userTag) {
    userObj = {
        tag: userTag,
        lastAwarded: 0,
        balance: 0,
        birthday: "",
        fStatReactionsAwarded: 0,
        fStatReactionsReceived: 0,
        fStatItemsUsed: 0,
        fStatHighestBal: 0
    }

    return userObj;
}

//function to save workingdata to json databases
function saveData(sync) {
    client.guilds.cache.map(guild => guild.id).forEach((guildId) => {
        if (sync) {
            fs.writeFileSync('./database' + guildId + '.json', JSON.stringify(workingData[guildId], null, 2));
        } else {
            fs.writeFile('./database' + guildId + '.json', JSON.stringify(workingData[guildId], null, 2), error => {
                if (error) console.log("Error writing to file: \n" + error);
            });
        }
    });
}