"use strict";
require('dotenv').config();
const { Client, IntentsBitField, ButtonStyle, ActionRowBuilder, ButtonBuilder, Options, Partials} = require('discord.js');
const fs = require('fs');
const usables = require('./items/usables.json');
const equipment = require('./items/equipment.json');
const config = require('./constants/configConsts.js');
const uiBuilder = require('./functions/uiBuilders.js');
const utils = require('./functions/utils.js');
const btnEventHandlers = require('./functions/btnEventHandlers.js');

/*
dotenv for loading environment variables from .env file
fs for reading/writing/editing json files
axios for sending easy http request
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
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildModeration,
        IntentsBitField.Flags.GuildIntegrations
    ],
    sweepers: {
        ...Options.DefaultSweeperSettings,
		messages: {
			interval: 3600, // Sweep message cache every hour
			lifetime: config.msgExpiration + 120,	// Remove messages older than msg expiration + 3 minutes.
		}
    },
    partials: [
        Partials.Reaction, Partials.Message, Partials.User
    ]
});

var workingData = {}; //In-memory data

//Shop pages and helper variables
var shopPages_usables = [];
var shopPages_others = [];
var shopPages_equipment = [];
var shopPages_equipmentDirectory = [];

//variable for directory of user birthdays
var birthdayDirectory = {};

var realtimeStockData = {lastUpdated: 0};
var tenDayStockData = {lastUpdated: 0};
var lastStockAPICall = 0;

/*
var realtimeStockData
Object holding current realtime data of different tracked stocks and a unix timestamp of the last time this data was updated.
format:
realtimeStockData = {
    lastUpdated: (unix timestamp),
    AAPL: {
        symbol: 'AAPL',
        name: 'Apple Inc',
        exchange: 'NASDAQ',
        mic_code: 'XNGS',
        currency: 'USD',
        datetime: '2023-04-27',
        timestamp: 1682625599,
        open: '165.19000',
        high: '168.56000',
        low: '165.19000'
    },
    AMZN: {
        (same as above with amazon data retrieved from API)
    }
}

var tenDayStockData
Object holding ten day stock data of different tracked stocks for graph drawing purposes.
format:
tenDayStockData = {
    lastUpdated: (unix timestamp),
    AAPL: {
        values: [(array of data points retrieved from API)],
        graphBuffer: (png buffer of drawn graph for easy re-use),
        graphLastUpdated: (unix timestamp of last time graph was updated and redrawn)
    }
}
*/

/*
TODO:
add log util
*/

//===================================================
//===================================================
//
//             CLIENT EVENT LISTENERS
//
//===================================================
//===================================================
process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

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
            if (!fs.existsSync("./databases/database" + guildId + ".json")) {
                //if database file for this guild doesnt exist then make the file and assign the new data to workingData var
                newData = {
                    activeMenuId: "",
                    activeMenuChannelId: "",
                    botNotifsChannelId: "",
                    itemBanishChannelId: "",
                    users:[],
                    msgLeaderboard: [],
                    bdaysWished: {}
                }

                fs.writeFileSync("./databases/database" + guildId + ".json", JSON.stringify(newData, null, 2));

                workingData[guildId] = newData;
            } else {
                //read data from json database file and assign it to workingData var synchronously
                workingData[guildId] = JSON.parse(fs.readFileSync("./databases/database" + guildId + ".json"));
            }
        } catch(error) {
            console.log(error);
        }

        //add entries for any users in guilds that are not in database
        client.guilds.resolve(guildId).members.fetch().then(memberManager => {
            let existingArray = [];
            let guildUsersArray = [];
    
            workingData[guildId].users.forEach((eUser) => {
                existingArray.push(eUser.id);
            });

            memberManager.forEach((gMember) => {
                guildUsersArray.push({
                    tag: gMember.user.tag,
                    id: gMember.id
                });
            });

            guildUsersArray.filter(user => !existingArray.includes(user.id)).forEach((newUser) => {
                workingData[guildId].users.push(utils.getNewUserJSON(newUser.tag, newUser.id));
            });

            fs.writeFileSync('./databases/database' + guildId + ".json", JSON.stringify(workingData[guildId], null, 2));
        }).catch(console.error);
        
        //update menu in case pick up edbucks button is stuck
        try {
            client.guilds.cache.get(guildId).channels.cache.get(workingData[guildId].activeMenuChannelId).messages.fetch(workingData[guildId].activeMenuId).then(result => {
                result.edit(uiBuilder.mainMenu());
            });
        } catch (exception) {
            console.log("Automatic menu update failed.");
        }

        try {
            birthdayDirectory[guildId] = utils.getUpdatedBirthdayDirectory(workingData, guildId)
        } catch {
            
        }
    });

    
    //Populate usables shop pages
    for (let pageIndex = 0; pageIndex < Math.ceil(usables.length / (4 * config.usablesShopItemsPerRow)); pageIndex++) {
        let newPage = [];
        for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
            let row = new ActionRowBuilder();
            for (let shelfIndex = 0; shelfIndex < config.usablesShopItemsPerRow; shelfIndex++) {
                if (usables[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex] != undefined) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(["usablesShop", "shelf", usables[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].name].join('-'))
                            .setLabel(usables[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].displayName + `|$${usables[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].price}`)
                            .setStyle(ButtonStyle.Success)
                    )
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel("Empty Shelf")
                            .setCustomId("EMPTYSHELF-" + ((pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    )
                }
            }
            newPage.push(row);
        }
        shopPages_usables.push(newPage);
    }
    //populate equipment shop directory
    for (let index = 0; index < (equipment.head.length > 0 ? Math.ceil(equipment.head.length / (config.equipsShopItemsPerRow * 4)) : 1); index++) {
        shopPages_equipmentDirectory.push(["head", index]);
    }

    for (let index = 0; index < (equipment.body.length > 0 ? Math.ceil(equipment.body.length / (config.equipsShopItemsPerRow * 4)) : 1); index++) {
        shopPages_equipmentDirectory.push(["body", index]);
    }

    for (let index = 0; index < (equipment.trinket.length > 0 ? Math.ceil(equipment.trinket.length / (config.equipsShopItemsPerRow * 4)) : 1); index++) {
        shopPages_equipmentDirectory.push(["trinket", index]);
    }

    for (let index = 0; index < (equipment.shoes.length > 0 ? Math.ceil(equipment.shoes.length / (config.equipsShopItemsPerRow * 4)) : 1); index++) {
        shopPages_equipmentDirectory.push(["shoes", index]);
    }

    //populate equipment shop pages
    shopPages_equipmentDirectory.forEach((dirEntry) => {
        let page = [];
        for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
            let row = new ActionRowBuilder();
            for (let slotIndex = 0; slotIndex < config.equipsShopItemsPerRow; slotIndex++) {
                if (equipment[dirEntry[0]][ ((4 * config.equipsShopItemsPerRow) * dirEntry[1]) + (rowIndex * config.equipsShopItemsPerRow) + slotIndex] != undefined) {
                    let itemInfo = equipment[dirEntry[0]][ ((4 * config.equipsShopItemsPerRow) * dirEntry[1]) + (rowIndex * config.equipsShopItemsPerRow) + slotIndex];
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(["equipsShop", "shelf", itemInfo.slot, itemInfo.name].join('-'))
                            .setLabel(`${itemInfo.displayName}|${itemInfo.price}`)
                            .setStyle(ButtonStyle.Success)
                    )
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel("Empty Shelf")
                            .setCustomId("EMPTYSHELF-" + dirEntry.toString() + ((4 * config.equipsShopItemsPerRow) + (rowIndex * config.equipsShopItemsPerRow) + slotIndex))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    )
                }
            }
            page.push(row);
        }
        shopPages_equipment.push(page);
    });

    //Set interval for autosaving workingData to json database files
    setInterval(() => {
        utils.saveData(client, workingData);
        let curDate = new Date(Date.now());
        console.log("(" + curDate.toLocaleString() + ") Autosave Complete!");
    }, config.saveInterval * 1000);

    //Set interval for checking voice channels to award active VCS
    setInterval(() => {
        client.guilds.cache.map(guild => guild).forEach(guild => {
            guild.channels.cache.map(channel => channel).forEach(channel => {
                //if the channel is not voicebased or is voicebased and has less than activeVCMemberThreshold members then return
                if (!channel.isVoiceBased()) return;
                if (channel.members.size < config.activeVCMemberThreshold) return;

                let awardMembers = [];
                let numUnmutedMembers = 0;

                channel.members.map(member => member).forEach(member => {
                    if (!member.voice.mute) {
                        awardMembers.push(member.id);
                        numUnmutedMembers += 1;
                    }
                });

                if (numUnmutedMembers >= config.activeVCMemberThreshold) {
                    awardMembers.forEach(recipient => {
                        let recipientData = workingData[guild.id].users.find(obj => {
                            return obj.id == recipient;
                        });

                        let recipientStatsAndEffects = utils.checkStatsAndEffects(workingData, {guildId: guild.id}, recipient);

                        recipientData.balance += config.activeVCReward + recipientStatsAndEffects.stats.vocalLuck;
                    });
                }
            });
        });
    }, config.checkActiveVCInterval * 1000);

    let curDate = new Date(Date.now());
    console.log(`(${client.user.tag}) is ready! ${curDate.toLocaleString()}`);
});

//on new guild user join, add entry to database if not already existing
client.on("guildMemberAdd", member => {
    let existingEntry = workingData[member.guild.id].users.find(entry => {
        return entry.id == member.id;
    });

    if (!existingEntry) {
        workingData[member.guild.id].users.push(utils.getNewUserJSON(member.user.tag, member.user.id));
    }
});

//event listener for messages mainly used for admin commands
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    if (message.content.charAt(0) == '>' && config.botAdmins.includes(message.author.id)) {
        //admin commands implementation
        let curDate = new Date(Date.now());
        switch(message.content.substring(1)) {
            case "spawnmenu":
                message.channel.send(uiBuilder.mainMenu()).then(msg => {
                    workingData[message.guildId].activeMenuId = msg.id;
                    workingData[message.guildId].activeMenuChannelId = msg.channelId;
                    utils.saveData(client, workingData);
                });
                break;

            case "save":
                utils.saveData(client, workingData);
                console.log(`(${curDate.toLocaleString()}) Manual Save Complete`);
                break;
            
            case "shutdown":
                utils.saveData(client, workingData, true);
                console.log(`(${curDate.toLocaleString()}) Manual Shutdown for Server: ${message.guild.name}`);
                client.destroy();
                break;

            case "load":
                client.guilds.cache.map(guild => guild.id).forEach((guildId) => {
                    try {
                        if (!fs.existsSync("./databases/database" + guildId + ".json")) {
                            //if database file for this guild doesnt exist then make the file and assign the new data to workingData var
                            newData = {
                                users:[],
                                activeMenuId: "",
                                msgLeaderboard: [],
                                msgLeaderboardFloor: 0
                            }
            
                            fs.writeFileSync("./databases/database" + guildId + ".json", JSON.stringify(newData, null, 2));
            
                            workingData[guildId] = newData;
                        } else {
                            //read data from json database file and assign it to workingData var synchronously
                            workingData[guildId] = JSON.parse(fs.readFileSync("./databases/database" + guildId + ".json"));
                        }
                    } catch(error) {
                        console.log(error);
                    }
                });
                console.log(`(${curDate.toLocaleString()}) Manual Load Complete`)
                break;

            case "updatemenu":
                message.guild.channels.cache.get(workingData[message.guildId].activeMenuChannelId).messages.fetch(workingData[message.guildId].activeMenuId).then(result => {
                    result.edit(uiBuilder.mainMenu());
                });
                console.log(`(${curDate.toLocaleString()}) Manual Menu Update Complete`);
                break;

            case "updateuserprops":
                let updatedUsersList = [];
                workingData[message.guildId].users.forEach(obj => {
                    let settingsArr = utils.getNewUserJSON("", "").settings;
                    let updatedEntry = utils.getNewUserJSON("","");
                    updatedEntry = Object.assign(updatedEntry, obj);

                    if (updatedEntry.settings.length < settingsArr.length) {
                        for (index = updatedEntry.settings.length; index < settingsArr.length; index ++) {
                            updatedEntry.settings.push(settingsArr[index]);
                        }
                    }

                    updatedUsersList.push(updatedEntry);
                });
                workingData[message.guildId].users = updatedUsersList;
                console.log(`(${curDate.toLocaleString()}) Manual User Properties Update Complete! Changes in database will take effect on next save.`);
                break;

            //a command used solely for random testing purposes
            case "testcommand":
                break;
        }
    } else {
        //check whether a message is wishing happy birthday
        let lcMessage = message.content.toLowerCase();
        let happyStrings = ["happy", "hppy", "appy", "hbd"];
        let birthdayStrings = ["birthday", "bday", "birfday", "birth day", "hbd"];
        //check if message is wishing happy birthday
        if (new RegExp(happyStrings.join("|")).test(lcMessage) && new RegExp(birthdayStrings.join("|")).test(lcMessage)) {
            //check if it's close to anyones bday
            let curDate = new Date(Date.now());
            let reacted = false;
            Object.keys(birthdayDirectory[message.guildId]).forEach(key => {
                //prevent users from wishing themselves happy bday
                if (key == message.author.id) return;
                if (birthdayDirectory[message.guildId][key].month == curDate.getMonth() + 1 && curDate.getDate() - 1 <= birthdayDirectory[message.guildId][key].day && birthdayDirectory[message.guildId][key].day <= curDate.getDate() + 1) {
                    if (!workingData[message.guildId].bdaysWished[`${key}-${curDate.getFullYear()}`]) {
                        //if bdaysWished property of this combo of bday person id + year doesnt exist then create the property and award edbucks accordingly
                        workingData[message.guildId].bdaysWished[`${key}-${curDate.getFullYear()}`] = [message.author.id];
                        let bdayWisher = workingData[message.guildId].users.find(obj => {
                            return obj.id == message.author.id;
                        });
                        let bdayUser = workingData[message.guildId].users.find(obj => {
                            return obj.id == key;
                        });
                        bdayWisher.balance += config.bdayWisherReward;
                        bdayUser.balance += config.bdayReceiverReward;

                        if (!reacted) message.react('🎉');
                        
                        reacted = true;

                    } else if (!workingData[message.guildId].bdaysWished[`${key}-${curDate.getFullYear()}`].includes(message.author.id)) {
                        //if bdaysWished property of this combo of bday person id + year does exist but the wisher is not in value array then add them to the array and award edbucks accordingly
                        workingData[message.guildId].bdaysWished[`${key}-${curDate.getFullYear()}`].push(message.author.id);
                        let bdayWisher = workingData[message.guildId].users.find(obj => {
                            return obj.id == message.author.id;
                        });
                        let bdayUser = workingData[message.guildId].users.find(obj => {
                            return obj.id == key;
                        });
                        bdayWisher.balance += config.bdayWisherReward;
                        bdayUser.balance += config.bdayReceiverReward;


                        if (!reacted) message.react('🎉');
                        
                        reacted = true;

                    }
                }
            });
        }
    }
});

//listen for updates on guild members
client.on('guildMemberUpdate', (oldMember, newMember) => {
    //enforce polymorph status effect on those afflicted

    //check if the member update was to nickname
    if (oldMember.displayName != newMember.displayName) {
        //get member data and existing polymorph status effect on member if it exists
        let memberData = workingData[newMember.guild.id].users.find(obj => {
            return obj.id == newMember.user.id;
        });

        let existingPolyIndex = memberData.statusEffects.findIndex(obj => {
            return obj.name == 'polymorph';
        });

        let existingPoly = memberData.statusEffects[existingPolyIndex];

        //if no polymorph status effect exists then return
        if (!existingPoly) return;

        if (newMember.displayName == existingPoly.polyName) return;

        //if the polymorph has not expired then enforce it else remove the expired effect
        if (existingPoly.expires >= Math.floor(Date.now()/1000)) {
            newMember.setNickname(existingPoly.polyName);
        } else {
            memberData.statusEffects.splice(existingPolyIndex, 1);
        }
    }
})

client.on('messageDelete', (message) => {
    if (message.partial) return;
    if (!message.guildId) return;

    let messageAuthorData = workingData[message.guildId].users.find(obj => {
        return obj.id == message.author.id;
    });

    messageAuthorData.lastChangedMsg = {
        time: Math.floor(message.createdTimestamp/1000),
        oldContent: message.content,
        newContent: "",
        channel: message.channel.id
    };
})

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (oldMessage.partial || newMessage.partial) return;
    if (!newMessage.guildId) return;
    if (newMessage.author.bot) return;

    let messageAuthorData = workingData[newMessage.guildId].users.find(obj => {
        return obj.id == newMessage.author.id;
    });

    messageAuthorData.lastChangedMsg = {
        time: Math.floor(newMessage.createdTimestamp/1000),
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        channel: newMessage.channel.id
    };
})

client.on('voiceStateUpdate', (oldState, newState) => {
    //only if user was not in any vc and now joined a vc
    if (!oldState.channelId && newState.channelId) {
        //get member data
        let memberData = workingData[newState.guild.id].users.find(obj => {
            return obj.id == newState.member.id;
        });

        //mute if this member has mute status effect
        let mutedStatusEffect = memberData.statusEffects.find(obj => {
            return obj.name == "muted";
        })

        if (mutedStatusEffect && mutedStatusEffect.expires > Math.floor(Date.now()/1000)) {
            newState.member.voice.setMute(true);
        }

        //unmute if this member is queued for an unmute
        if (memberData.queuedForUnmute) {
            newState.member.voice.setMute(false);
            memberData.queuedForUnmute = false;
        }
    }
});

client.on('messageReactionAdd', async (messageReaction, user) => {
    if (messageReaction.emoji.name != config.currencyEmojiName) return;
    if (!messageReaction.message.guildId) return;

    //base system for awarding edbucks to users whose msgs get edbuck reactions
    let messageScore = 0;

    //handle partials
    if (messageReaction.partial) {
        try {
            await messageReaction.fetch();
        } catch (err) {
            console.log(err);
            return;
        }

        await messageReaction.message.channel.messages.fetch(messageReaction.message.id).then(msg => {
            messageScore = msg.reactions.cache.find(reaction => {
                return reaction.emoji.name == config.currencyEmojiName;
            }).count;
        });
    } else {
        messageScore = messageReaction.message.reactions.cache.find(reaction => {
            return reaction.emoji.name == config.currencyEmojiName;
        }).count;
    }

    //If the reactor and the reacted to are the same person then dont award anything.
    if (user.id == messageReaction.message.author.id) return;

    //do a time check for the reactor
    let storedUserData = workingData[messageReaction.message.guildId].users.find(obj => {
        return obj.id == user.id;
    })

    let currTime = Math.floor(Date.now() / 1000);

    //check and update msg leaderboard
    //if the message's edbuck reaction count is greater than or equal to the current leaderboard floor then update leaderboard

    
    let currLeaderboard = workingData[messageReaction.message.guildId].msgLeaderboard;
    if (currLeaderboard.length < config.msgLeaderboardLimit || messageScore >= currLeaderboard[currLeaderboard.length - 1].score) {

        let messageSnippet = (messageReaction.message.embeds.length || messageReaction.message.attachments.size || messageReaction.message.content.length <= 0) ? "MEDIA POST" : messageReaction.message.content.length > 50 ? messageReaction.message.content.substring(0, 47) + "...": messageReaction.message.content.substring(0, 50);

        //Check if current message is already on leaderboard and if so then remove it from the leaderboard before processing where to update its position
        let dupeIndex = currLeaderboard.findIndex(entry => {
            return entry.id == messageReaction.message.id;
        });

        if (dupeIndex >= 0) {
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
            let replaceIndex = config.msgLeaderboardLimit;
            for (let i in currLeaderboard) {
                if (messageScore >= currLeaderboard[i].score) {
                    replaceIndex = i;
                    break;
                }
            }
            if (replaceIndex < config.msgLeaderboardLimit) {
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
            while (currLeaderboard.length > config.msgLeaderboardLimit) currLeaderboard.pop();
        }
    }

    if (currTime - storedUserData.lastAwarded >= config.reactCooldown) {

        //do a time check for the reacted to message
        if (currTime - Math.floor(messageReaction.message.createdTimestamp/1000) <= config.msgExpiration) {
            //find recipient user's data object in working data var
            let recipient = workingData[messageReaction.message.guildId].users.find(obj => {
                return obj.id == messageReaction.message.author.id;
            });

            //get recipient stats and effects
            let recipientStatsAndEffects = utils.checkStatsAndEffects(workingData, {guildId: messageReaction.message.guildId}, messageReaction.message.author.id);

            //award recipient edbucks
            recipient.balance += config.reactAward + recipientStatsAndEffects.stats.reactionBonus;

            //update lastAwarded parameter of the reactor to the current time 
            storedUserData.lastAwarded = currTime;

            //update fun stats
            storedUserData.fStatReactionsAwarded += 1;
            recipient.fStatReactionsReceived += 1;
        } else {
            //TODO: Find a way to send a non-spammy message saying the reacted to message is expired
        }
    } else {
        //TODO: Find a way to send a non-spammy message saying that you cant award edbucks yet
    }
});

//===================================================
//             BUTTON EVENT LISTENERS
//===================================================

/*
The main interaction event listener parses the received interaction's customId and splits it into an array of string tokens
    called eventTokens.

The eventTokens array is in the format: ["UIInteractedWith", "name/typeOfComponentInteractedWith", ..."anyOtherData"]

The first two tokens are consumed by the interactionCreate listener and the interactionListenersMap so the only tokens passed
    to the btnEventHandlers functions are the optional additional data tokens if any were passed by the interaction.
*/

//Interaction event listeners map
var interactionListenersMap = new Map();

interactionListenersMap.set("mainMenu", async (interaction, eventTokens) => {
    switch(eventTokens.shift()) {
        case "showStats":
            btnEventHandlers.mainMenu_showStats(workingData, interaction);
            break;
    
        case "openInv":
            btnEventHandlers.mainMenu_openInv(workingData, interaction);
            break;
        
        case "trade":
            break;

        case "findTreasure":
            btnEventHandlers.mainMenu_findTreasure(workingData, interaction);
            break;
        
        case "minigames":
            break;

        case "challenge":
            break;

        case "wager":
            break;

        case "shop":
            btnEventHandlers.mainMenu_shop(interaction);
            break;

        case "stockExchange":
            await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
                realtimeStockData = values[0];
                tenDayStockData = values[1];
                lastStockAPICall = values[2];
            });
            btnEventHandlers.mainMenu_stockExchange(workingData, interaction, realtimeStockData);
            break;

        case "help":
            //Show help text for the bot
            btnEventHandlers.mainMenu_help(interaction);
            break;
        
        case "userLeaderboard":
            //Display leaderboard for top balance users
            await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
                realtimeStockData = values[0];
                tenDayStockData = values[1];
                lastStockAPICall = values[2];
            });
            btnEventHandlers.mainMenu_userLeaderboard(workingData, interaction, realtimeStockData);
            break;
        
        case "msgLeaderboard":
            //Display leaderboard for top earning messages
            btnEventHandlers.mainMenu_msgLeaderboard(client, workingData, interaction);
            break;

        case "settings":
            btnEventHandlers.mainMenu_settings(workingData, interaction);
            break;

        case "changelog":
            btnEventHandlers.mainMenu_changelog(interaction);
            break;
    }
});

interactionListenersMap.set("mainHelp", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "back":
            btnEventHandlers.mainHelp_back(interaction);
            break;

        case "prev":
            btnEventHandlers.mainHelp_prev(interaction, eventTokens);
            break;

        case "next":
            btnEventHandlers.mainHelp_next(interaction, eventTokens);
            break;
        
        case "sectionButton":
            btnEventHandlers.mainHelp_sectionButton(interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("msgLeaderboard", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.msgLeaderboard_prev(client, workingData, interaction, eventTokens);
            break;

        case "next":
            btnEventHandlers.msgLeaderboard_next(client, workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("userLeaderboard", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.userLeaderboard_prev(workingData, interaction, realtimeStockData, eventTokens);
            break;

        case "next":
            btnEventHandlers.userLeaderboard_next(workingData, interaction, realtimeStockData, eventTokens);
            break;
    }
});

interactionListenersMap.set("changelog", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.changelog_prev(interaction, eventTokens);
            break;

        case "next":
            btnEventHandlers.changelog_next(interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("settings", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.settings_prev(workingData, interaction, eventTokens);
            break;

        case "next":
            btnEventHandlers.settings_next(workingData, interaction, eventTokens);
            break;

        case "editSettingValue":
            btnEventHandlers.settings_editSettingValue(workingData, interaction, eventTokens);
            break;

        case "submitModal":
            btnEventHandlers.settings_submitModal(workingData, interaction, eventTokens, birthdayDirectory);
            break;
    }
});

interactionListenersMap.set("shopCategories", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "usables":
            btnEventHandlers.shopCategories_usables(interaction, shopPages_usables);
            break;

        case "equipment":
            btnEventHandlers.shopCategories_equipment(interaction, shopPages_equipment, shopPages_equipmentDirectory);
            break;

        case "others":
            btnEventHandlers.shopCategories_others();//NOTE: not implemented yet
            break;
    }
});

interactionListenersMap.set("usablesShop", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.usablesShop_prev(interaction, eventTokens, shopPages_usables);
            break;

        case "next":
            btnEventHandlers.usablesShop_next(interaction, eventTokens, shopPages_usables);
            break;

        case "shelf":
            btnEventHandlers.usablesShop_shelf(workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("usablesShopItemInfo", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "back":
            btnEventHandlers.usablesShopItemInfo_back(interaction, shopPages_usables);
            break;

        case "purchase":
            btnEventHandlers.usablesShopItemInfo_purchase(workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("equipsShop", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.equipsShop_prev(interaction, eventTokens, shopPages_equipment, shopPages_equipmentDirectory);
            break;

        case "next":
            btnEventHandlers.equipsShop_next(interaction, eventTokens, shopPages_equipment, shopPages_equipmentDirectory);
            break;
        
        case "shelf":
            btnEventHandlers.equipsShop_shelf(interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("equipsShopItemInfo", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "back":
            btnEventHandlers.equipsShopItemInfo_back(interaction, shopPages_equipment, shopPages_equipmentDirectory);
            break;

        case "purchase":
            btnEventHandlers.equipsShopItemInfo_purchase(workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("usablesInv", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.usablesInv_prev(workingData, interaction, eventTokens);
            break;

        case "next":
            btnEventHandlers.usablesInv_next(workingData, interaction, eventTokens);
            break;

        case "equips":
            btnEventHandlers.usablesInv_equips(workingData, interaction);
            break;

        case "invSpace":
            btnEventHandlers.usablesInv_invSpace(workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("usablesInvItemInfo", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "back":
            btnEventHandlers.usablesInvItemInfo_back(workingData, interaction);
            break;

        case "use":
            btnEventHandlers.usablesInvItemInfo_use(client, workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("equipsInv", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "prev":
            btnEventHandlers.equipsInv_prev(workingData, interaction, eventTokens);
            break;

        case "next":
            btnEventHandlers.equipsInv_next(workingData, interaction, eventTokens);
            break;

        case "usables":
            btnEventHandlers.equipsInv_usables(workingData, interaction);
            break;

        case "invSpace":
            btnEventHandlers.equipsInv_invSpace(workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("equipsInvItemInfo", (interaction, eventTokens) => {
    switch (eventTokens.shift()) {
        case "back":
            btnEventHandlers.equipsInvItemInfo_back(workingData, interaction);
            break;

        case "equip":
            btnEventHandlers.equipsInvItemInfo_equip(workingData, interaction, eventTokens);
            break;
    }
});

interactionListenersMap.set("stockExchange", async (interaction, eventTokens) => {
    await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
        realtimeStockData = values[0];
        tenDayStockData = values[1];
        lastStockAPICall = values[2];
    });
    switch (eventTokens.shift()) {
        case "prev":
            //NOTE: not implemented due to limitation of 8 tracked stocks because of API limits
            break;

        case "next":
            //NOTE: not implemented due to limitation of 8 tracked stocks because of API limits
            break;

        case "refresh":
            btnEventHandlers.stockExchange_refresh(workingData, interaction, realtimeStockData);
            break;

        case "selectStock":
            btnEventHandlers.stockExchange_selectStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
            break;
    }
});

interactionListenersMap.set("stockExchangeStockInfo", async (interaction, eventTokens) => {
    await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
        realtimeStockData = values[0];
        tenDayStockData = values[1];
        lastStockAPICall = values[2];
    });
    switch (eventTokens.shift()) {
        case "back":
            btnEventHandlers.stockExchangeStockInfo_back(workingData, interaction, realtimeStockData);
            break;

        case "refresh":
            btnEventHandlers.stockExchangeStockInfo_refresh(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
            break;

        case "invest":
            btnEventHandlers.stockExchangeStockInfo_invest(workingData, interaction, realtimeStockData, eventTokens);
            break;

        case "sell":
            btnEventHandlers.stockExchangeStockInfo_sell(workingData, interaction, realtimeStockData, eventTokens);
            break;
    }
});

interactionListenersMap.set("stockExchangeSellStocks", async (interaction, eventTokens) => {
    await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
        realtimeStockData = values[0];
        tenDayStockData = values[1];
        lastStockAPICall = values[2];
    });
    switch (eventTokens.shift()) {
        case "sell":
            btnEventHandlers.stockExchangeSellStocks_sell(workingData, interaction, realtimeStockData, eventTokens);
            break;

        case "prev":
            btnEventHandlers.stockExchangeSellStocks_prev(workingData, interaction, realtimeStockData, eventTokens);
            break;

        case "next":
            btnEventHandlers.stockExchangeSellStocks_next(workingData, interaction, realtimeStockData, eventTokens);
            break;

        case "back":
            btnEventHandlers.stockExchangeSellStocks_back(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
            break;
    }
});

client.on('interactionCreate', async (interaction) => {
    //if interaction is not a button or doesnt have a guildId then return
    if (!interaction.guildId) return;

    let eventTokens = interaction.customId.split("-");

    interactionListenersMap.get(eventTokens.shift())(interaction, eventTokens);
});

//===================================================
//all client event listeners must be before this line
//===================================================
client.login(process.env.CLIENT_TOKEN);
