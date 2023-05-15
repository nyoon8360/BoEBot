"use strict";
require('dotenv').config();
const { Client, IntentsBitField, ButtonStyle, ActionRowBuilder, ButtonBuilder, Options, Partials} = require('discord.js');
const fs = require('fs');
const usables = require('./items/usables.json');
const equipment = require('./items/equipment.json');
const intEventTokens = require('./constants/intEventTokens.js');
const config = require('./constants/configConsts.js');
const { usableItemsFunctionalities } = require('./functions/itemFunctions.js');
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
                    msgLeaderboardFloor: 0,
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
                result.edit(uiBuilder.menuUI());
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
                            .setCustomId(intEventTokens.usablesShopSelectShelfPrefix + usables[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].name)
                            .setLabel(usables[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].displayName + `|$${usables[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].price}`)
                            .setStyle(ButtonStyle.Success)
                    )
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel("Empty Shelf")
                            .setCustomId(intEventTokens.usablesShopSelectShelfPrefix + "EMPTYSHELF-" + ((pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex))
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
                            .setCustomId(intEventTokens.equipShopSelectShelfPrefix + `${itemInfo.slot}-${itemInfo.name}`)
                            .setLabel(`${itemInfo.displayName}|${itemInfo.price}`)
                            .setStyle(ButtonStyle.Success)
                    )
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel("Empty Space")
                            .setCustomId(intEventTokens.equipShopSelectShelfPrefix + "EMPTYSPACE-" + dirEntry.toString() + ((4 * config.equipsShopItemsPerRow) + (rowIndex * config.equipsShopItemsPerRow) + slotIndex))
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

    /*

     |
[any ticker]
     V
    
    The Edbuck Exchange
    -------------------
    Equity: Apple Inc
    Ticker: $AAPL
    Current Price: $168.42999
    Exchange: NASDAQ
    Day Percent Change: 2.85173%
    Open Price: $165.19000
    Trade Volume: 51,528,660
    Last Updated: |April 25th 3:44 PM|

    Total Original Investments Value: 47 EB
    Total Current Investments Value: 65.83 EB
    [Refresh] [Sell] [Invest]

    <IMAGE ATTACHMENT DRAWN FROM DAY INTERVAL GRAPH
     OF STOCK PERFORMANCE OVER PAST 10 DATA POINTS >

     |
   [Sell]
     V

    The Edbuck Exchange
    -------------------
    Equity: Apple Inc
    Ticker: $AAPL
    Current Price: $168.42999
    Last Updated: |April 25th 3:44 PM|

    Total Original Investments Value: 47 EB
    Total Current Investments Value: 65.83 EB

    Stock Profit Bonus: 20%

    [Investment 1]
    Original Investment: 20EB
    Date/Time Entered: April 24th 6:32 PM
    Price Entered At: $162.21164
    % Change: ((curPrice/entPrice) - 1) * 100 = 12.28%
    Current Investment Value: 23 (oInvestment * (curPrice/entPrice)) IF (curPrice/entPrice) > 1 THEN multiply PROFITS by profit multiplier

    [Inv 1] [Inv 2] [Inv 3] [Inv 4]
    [Back] [Previous] [Pagenum] [Next]

    o1 = investment1
    o2 = investment2
    sv1 = investment1 stock value
    sv2 = investment2 stock value
    nv = final stock value

    (o1 * (nv/sv1)) + (o2 * (nv/sv2)) = total new
    o1 + o2 = total original investment
    */
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
                message.channel.send(uiBuilder.menuUI()).then(msg => {
                    workingData[message.guildId].activeMenuId = msg.id;
                    workingData[message.guildId].activeMenuChannelId = msg.channelId;
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
                    result.edit(uiBuilder.menuUI());
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
                
                message.react("😀");

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

    if (messageReaction.emoji.name != config.currencyEmojiName) return;
    if (!messageReaction.message.guildId) return;

    //If the reactor and the reacted to are the same person then dont award anything.
    if (user.id == messageReaction.message.author.id) return;

    //do a time check for the reactor
    let storedUserData = workingData[messageReaction.message.guildId].users.find(obj => {
        return obj.id == user.id;
    })

    let currTime = Math.floor(Date.now() / 1000);

    //check and update msg leaderboard
    //if the message's edbuck reaction count is greater than or equal to the current leaderboard floor then update leaderboard
    if (messageScore >= workingData[messageReaction.message.guildId].msgLeaderboardFloor) {
        let currLeaderboard = workingData[messageReaction.message.guildId].msgLeaderboard;

        let messageSnippet = (messageReaction.message.embeds.length || messageReaction.message.attachments.size || messageReaction.message.content.length <= 0) ? "MEDIA POST" : messageReaction.message.content.length > 20 ? messageReaction.message.content.substring(0, 17) + "...": messageReaction.message.content.substring(0, 20);

        //Check if current message is already on leaderboard and if so then remove it from the leaderboard before processing where to update its position
        let dupeIndex = currLeaderboard.findIndex((entry) => {
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
                    console.log("Replace Index: " + i);
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

            //update leaderboard floor
            workingData[messageReaction.message.guildId].msgLeaderboardFloor = currLeaderboard[currLeaderboard.length - 1].score;
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
client.on('interactionCreate', async (interaction) => {
    //if interaction is not a button or doesnt have a guildId then return
    if (!interaction.guildId) return;

    let eventTokens = interaction.customId.split("-");

    //handlers for main menu interaction events
    switch (eventTokens.shift()) {
        //Main menu events
        case intEventTokens.mainMenuPrefix.slice(0, -1):
            switch(eventTokens.shift()) {
                case "showstats":
                //show user stats
                btnEventHandlers.mainMenu_showStats(workingData, interaction);
                break;
            
                case "openinv":
                    btnEventHandlers.mainMenu_openInv(workingData, interaction);
                    break;
        
                case "trade":
                    break;
        
                case "findtreasure":
                    //Pick up edbucks button
                    btnEventHandlers.mainMenu_findTreasure(workingData, interaction);
                    break;
                
                case "minigames":
                    break;
        
                case "challenge":
                    break;
        
                case "wager":
                    break;
        
                case "shop":
                    //Open shop categories
                    btnEventHandlers.mainMenu_shop(interaction);
                    break;
        
                case "stockexchange":
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
                
                case "userleaderboard":
                    //Display leaderboard for top balance users
                    btnEventHandlers.mainMenu_userLeaderboard(workingData, interaction);
                    break;
                
                case "msgleaderboard":
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
            break;

        case intEventTokens.settingsEditValuePrefix.slice(0, -1):
            btnEventHandlers.settings_editSettingValue(workingData, interaction, eventTokens, birthdayDirectory);
            break;

        case intEventTokens.userLeaderboardNavPrefix.slice(0, -1):
            switch (eventTokens.shift()) {
                case "PREV":
                    interaction.update(uiBuilder.userLeaderboardUI(workingData, interaction, parseInt(eventTokens.shift()) - 1));
                    break;

                case "NEXT":
                    interaction.update(uiBuilder.userLeaderboardUI(workingData, interaction, parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        //Inventory slot select events
        case intEventTokens.playerUsablesInvSelectSlotPrefix.slice(0, -1):
            btnEventHandlers.usablesInventory_selectSlot(workingData, interaction, eventTokens);
            break;

        case intEventTokens.playerUsablesInvInfoPrefix.slice(0, -1):
            switch(eventTokens.shift()) {
                case "BACK":
                    interaction.update(uiBuilder.usablesInvUI(workingData, interaction, 0));
                    break;
                
                case "USE":
                    usableItemsFunctionalities(client, workingData, interaction, eventTokens);
                    break;
            }
            break;

        //usables inventory navigation button events
        case intEventTokens.playerUsablesInvNavPrefix.slice(0, -1):
            switch (eventTokens.shift()) {
                case "PREV":
                interaction.update(uiBuilder.usablesInvUI(workingData, interaction, parseInt(eventTokens.shift()) - 1));
                break;

                case "EQUIPS":
                    interaction.update(uiBuilder.equipsInvUI(workingData, interaction, 0));
                    break;

                case "NEXT":
                    interaction.update(uiBuilder.usablesInvUI(workingData, interaction, parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        //equips inventory navigation button events
        case intEventTokens.playerEquipsInvNavPrefix.slice(0, -1):
            switch (eventTokens.shift()) {
                case "PREV":
                interaction.update(uiBuilder.equipsInvUI(workingData, interaction, parseInt(eventTokens.shift()) - 1));
                break;

                case "USABLES":
                    interaction.update(uiBuilder.usablesInvUI(workingData, interaction, 0));
                    break;

                case "NEXT":
                    interaction.update(uiBuilder.equipsInvUI(workingData, interaction, parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        //Shop category menu events
        case intEventTokens.shopCategoryPrefix.slice(0, -1):
            switch (eventTokens.shift()) {
                case "usables":
                    //open page 1 of the usables shop
                    interaction.update(uiBuilder.usablesShopUI(shopPages_usables, 0));
                    break;
                
                case "equipment":
                    interaction.update(uiBuilder.equipsShopUI(shopPages_equipment, shopPages_equipmentDirectory, 0));
                    break;
    
                case "others":
                    //TODO: figure out what other usables to implement then implement store
                    break;
            }
            break;
        
        //Usables shop shelf select events
        case intEventTokens.usablesShopSelectShelfPrefix.slice(0, -1):
            //Open window displaying selected item's purchase page
            btnEventHandlers.usablesShop_selectShelf(workingData, interaction, eventTokens);
            break;

        //Usables shop nav buttons events
        case intEventTokens.usablesShopNavPagesPrefix.slice(0, -1):
            //Navigate pages of usables shop

            switch(eventTokens.shift()) {
                case "PREV":
                    interaction.update(uiBuilder.usablesShopUI(shopPages_usables, parseInt(eventTokens.shift()) - 1));
                    break;

                case "NEXT":
                    interaction.update(uiBuilder.usablesShopUI(shopPages_usables, parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        //Usables shop purchase menu events
        case intEventTokens.usablesShopPurchaseMenuPrefix.slice(0, -1):
            if (eventTokens.shift() == "BACK") {
                //Open page 1 of the usables shop if the BACK button is pressed in an item's purchase window
                interaction.update(uiBuilder.usablesShopUI(shopPages_usables, 0));
            } else {
                btnEventHandlers.usablesShop_purchase(workingData, interaction, eventTokens);
            }
            break;

        case intEventTokens.changelogNavPrefix.slice(0, -1):
            switch(eventTokens.shift()){
                case "PREV":
                    interaction.update(uiBuilder.changelogUI(parseInt(eventTokens.shift()) - 1));
                    break;

                case "NEXT":
                    interaction.update(uiBuilder.changelogUI(parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        case intEventTokens.equipShopNavPagesPrefix.slice(0, -1):
            switch (eventTokens.shift()) {
                case "PREV":
                    interaction.update(uiBuilder.equipsShopUI(shopPages_equipment, shopPages_equipmentDirectory, parseInt(eventTokens.shift()) - 1));
                    break;

                case "NEXT":
                    interaction.update(uiBuilder.equipsShopUI(shopPages_equipment, shopPages_equipmentDirectory, parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        //Equipment shop select shelf events 
        case intEventTokens.equipShopSelectShelfPrefix.slice(0, -1):
            btnEventHandlers.equipsShop_selectShelf(interaction, eventTokens);
            break;

        case intEventTokens.equipShopPurchaseMenuPrefix.slice(0, -1):
            if (eventTokens.shift() == "BACK") {
                //Open page 1 of the usables shop if the BACK button is pressed in an item's purchase window
                interaction.update(uiBuilder.equipsShopUI(shopPages_equipment, shopPages_equipmentDirectory, 0));
            } else {
                btnEventHandlers.equipsShop_purchase(workingData, interaction, eventTokens);
            }
            break;

        case intEventTokens.playerEquipsInvSelectSlotPrefix.slice(0, -1):
            btnEventHandlers.equipsInventory_selectSlot(workingData, interaction, eventTokens);
            break;

        case intEventTokens.playerEquipsInvInfoPrefix.slice(0, -1) :
            switch(eventTokens.shift()) {
                case "BACK":
                    interaction.update(uiBuilder.equipsInvUI(workingData, interaction, 0));
                    break;

                case "EQUIP":
                    btnEventHandlers.equipsInventory_toggleEquip(workingData, interaction, eventTokens);
                    break;
            }
            break;

        case intEventTokens.settingsNavPrefix.slice(0, -1):
            switch(eventTokens.shift()) {
                case "NEXT":
                    interaction.update(uiBuilder.settingsUI(workingData, interaction, parseInt(eventTokens.shift()) + 1));
                    break;

                case "PREV":
                    interaction.update(uiBuilder.settingsUI(workingData, interaction, parseInt(eventTokens.shift()) - 1));
                    break;
            }

            break;

        case intEventTokens.stockExchangeNavPrefix.slice(0, -1):
            //NOTE: No need for switch statement here since only refresh button needs to be implemented since we cant have more than 1 page currently due to API limits
            await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
                realtimeStockData = values[0];
                tenDayStockData = values[1];
                lastStockAPICall = values[2];
            });
            btnEventHandlers.stockExchange_refreshStockInfo(workingData, interaction, realtimeStockData);
            break;

        case intEventTokens.stockExchangeSelectStockPrefix.slice(0, -1):
            await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
                realtimeStockData = values[0];
                tenDayStockData = values[1];
                lastStockAPICall = values[2];
            });
            btnEventHandlers.stockExchange_selectStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
            break;

        case intEventTokens.stockExchangeInfoPagePrefix.slice(0, -1):
            await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
                realtimeStockData = values[0];
                tenDayStockData = values[1];
                lastStockAPICall = values[2];
            });
            switch (eventTokens.shift()) {
                case "BACK":
                    btnEventHandlers.stockExchange_refreshStockInfo(workingData, interaction, realtimeStockData);
                    break;

                case "REFRESH":
                    btnEventHandlers.stockExchange_selectStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
                    break;

                case "SELL":
                    btnEventHandlers.stockExchange_openInvestments(workingData, interaction, realtimeStockData, eventTokens, 0);
                    break;

                case "INVEST":
                    btnEventHandlers.stockExchange_investInStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
                    break;
                
                case "NOTIFBACK":
                    btnEventHandlers.stockExchange_selectStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
                    break;
            }
            break;

        case intEventTokens.stockExchangeSellPagePrefix.slice(0, -1):
            await utils.getUpdatedStockData(realtimeStockData, tenDayStockData, lastStockAPICall).then((values) => {
                realtimeStockData = values[0];
                tenDayStockData = values[1];
                lastStockAPICall = values[2];
            });
            switch (eventTokens.shift()) {
                case "BACK":
                    btnEventHandlers.stockExchange_selectStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens);
                    break;

                case "PREV":
                    let prevPagenum = parseInt(eventTokens.shift()) - 1;
                    btnEventHandlers.stockExchange_openInvestments(workingData, interaction, realtimeStockData, eventTokens, prevPagenum);
                    break;

                case "NEXT":
                    let nextPagenum = parseInt(eventTokens.shift()) + 1;
                    btnEventHandlers.stockExchange_openInvestments(workingData, interaction, realtimeStockData, eventTokens, nextPagenum);
                    break;

                case "SELL":
                    btnEventHandlers.stockExchange_executeStockSell(workingData, interaction, realtimeStockData, eventTokens);
                    break;
            }
            break;
    }
});

//===================================================
//all client event listeners must be before this line
//===================================================
client.login(process.env.CLIENT_TOKEN);