require('dotenv').config();
const { Client, IntentsBitField, ButtonStyle, time, ActionRowBuilder, ButtonBuilder, inlineCode, bold, underscore, Options, EmbedBuilder, codeBlock, TextInputBuilder, TextInputStyle, MentionableSelectMenuBuilder, userMention, ModalBuilder, UserSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, DiscordAPIError } = require('discord.js');
const fs = require('fs');
const items = require('./items.json');
const changelog = require('./changelog.json');
const intEventTokens = require('./constants/intEventTokens.js');
const config = require('./constants/configConsts.js');
const { usableItemsFunctionalities } = require('./functions/itemFunctions.js');

/*
axios for easy HTTP promises with node.js
dotenv for loading environment variables from .env file
fs for reading/writing/editing json files

database.json format:
{
    "users": [
        {
            "tag":"string with discord user's tag i.e 'inspirasian#1234'",
            "balance": 0,
            "lastAwarded": 1678310667 this will be a number using epoch unix timestamp in seconds,
            "itemInventory": [
                {
                    "name": "item_kick",
                    "count": 0
                }
            ],
            "equipmentInventory": {
                head: [

                ],
                body: [],
                accessories: [],
                shoes: []
            },
            "equipped": [
                {
                    "slot": "head",
                    "name": "mirror_ring",
                    "effectingStat": "reflect",
                    "effectAmount": 5
                }
            ],
            settings: {
                "itemsPerInventoryRow": 5
            },
            statusEffects: [
                {
                    name: "Reflect",
                    expires: 1456346124 this number will be an epoch timestamp in seconds
                }
            ]
        }
    ],
    "msgLeaderboard": [
        {
            "msgId": "123215422542",
        }
    ],
    "msgLeaderboardFloor": 0
}

[Equips]
 |
 V
head, body, accessory, shoes
[bold("E* item1")] [Item2] [Item3]
[Item1] [Item2] [Item3]
[Item1] [Item2] [Item3]
[Item1] [Item2] [Item3]
[Prev] [Equips] [Next]
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

//Shop pages and helper variables
var shopPages_usables = [];
var shopPages_others = [];
/*
index 1: head equipment
index 2: ...
*/
var shopPages_equipment = [];

//===================================================
//===================================================
//
//             CLIENT EVENT LISTENERS
//
//===================================================
//===================================================

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
                    activeMenuId: "",
                    activeMenuChannelId: "",
                    msgLeaderboardFloor: 0,
                    botNotifsChannelId: "",
                    itemBanishChannelId: "",
                    users:[],
                    msgLeaderboard: []
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
                existingArray.push(eUser.id);
            });

            memberManager.forEach((gMember) => {
                guildUsersArray.push({
                    tag: gMember.user.tag,
                    id: gMember.id
                });
            });

            guildUsersArray.filter(user => !existingArray.includes(user.id)).forEach((newUser) => {
                workingData[guildId].users.push(getNewUserJSON(newUser.tag, newUser.id));
            });

            fs.writeFileSync('./database' + guildId + ".json", JSON.stringify(workingData[guildId], null, 2));
        }).catch(console.error);
        
        //update menu in case pick up edbucks button is stuck
        try {
            client.guilds.cache.get(guildId).channels.cache.get(workingData[guildId].activeMenuChannelId).messages.fetch(workingData[guildId].activeMenuId).then(result => {
                result.edit(openMenu());
            });
        } catch (exception) {
            console.log("Automatic menu update failed.");
        }
    });

    
    //Populate usables shop pages
    for (let pageIndex = 0; pageIndex < Math.ceil(items.length / (4 * config.usablesShopItemsPerRow)); pageIndex++) {
        let newPage = [];
        for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
            let row = new ActionRowBuilder();
            for (let shelfIndex = 0; shelfIndex < config.usablesShopItemsPerRow; shelfIndex++) {
                if (items[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex] != undefined) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(intEventTokens.usablesShopSelectShelfPrefix + items[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].name)
                            .setLabel(items[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].displayName + `|$${items[(pageIndex * (4 * config.usablesShopItemsPerRow)) + (rowIndex * config.usablesShopItemsPerRow) + shelfIndex].price}`)
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

    //Set interval for autosaving workingData to json database files
    setInterval(() => {
        saveData();
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

                        recipientData.balance += config.activeVCReward;
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
        workingData[member.guild.id].users.push(getNewUserJSON(member.user.tag, member.user.id));
    }
});

//event listener for messages mainly used for admin commands
client.on('messageCreate', (message) => {
    if (!message.content.charAt(0) == '>') return;
    if (message.author.bot) return;

    //if command sender is not a bot admin then do not process command
    if (!config.botAdmins.includes(message.author.id)) return;

    let curDate = new Date(Date.now());
    switch(message.content.substring(1)) {
        case "spawnmenu":

            message.channel.send(openMenu()).then(msg => {
                workingData[message.guildId].activeMenuId = msg.id;
                workingData[message.guildId].activeMenuChannelId = msg.channelId;
            });

            break;

        case "save":
            saveData();
            console.log(`(${curDate.toLocaleString()}) Manual Save Complete`);
            break;
        
        case "shutdown":
            saveData(true);
            console.log(`(${curDate.toLocaleString()}) Manual Shutdown for Server: ${message.guild.name}`);
            client.destroy();
            break;

        case "load":
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
            });
            console.log(`(${curDate.toLocaleString()}) Manual Load Complete`)
            break;

        case "updatemenu":
            message.guild.channels.cache.get(workingData[message.guildId].activeMenuChannelId).messages.fetch(workingData[message.guildId].activeMenuId).then(result => {
                result.edit(openMenu());
            });
            console.log(`(${curDate.toLocaleString()}) Manual Menu Update Complete`);
            break;

        case "updateuserprops":
            let updatedUsersList = [];
            workingData[message.guildId].users.forEach(obj => {
                let updatedEntry = getNewUserJSON("","");
                updatedUsersList.push(Object.assign(updatedEntry, obj));
            });
            workingData[message.guildId].users = updatedUsersList;
            console.log(`(${curDate.toLocaleString()}) Manual User Properties Update Complete! Changes in database will take effect on next save.`);
            break;
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

client.on('messageReactionAdd', (messageReaction, user) => {
    //base system for awarding edbucks to users whose msgs get edbuck reactions
    if (messageReaction.emoji.name != config.currencyEmojiName) return;
    if (!messageReaction.message.guildId) return;

    //If the reactor and the reacted to are the same person then dont award anything.
    if (user.id == messageReaction.message.author.id) return;

    //do a time check for the reactor
    let storedUserData = workingData[messageReaction.message.guildId].users.find(obj => {
        return obj.id == user.id;
    })

    let currTime = Math.floor(Date.now() / 1000);

    if (currTime - storedUserData.lastAwarded >= config.reactCooldown) {

        //do a time check for the reacted to message
        if (currTime - Math.floor(messageReaction.message.createdTimestamp/1000) <= config.msgExpiration) {
            //find recipient user's data object in working data var
            let recipient = workingData[messageReaction.message.guildId].users.find(obj => {
                return obj.id == messageReaction.message.author.id;
            });

            //award recipient edbucks
            recipient.balance += config.reactAward;

            //update lastAwarded parameter of the reactor to the current time 
            storedUserData.lastAwarded = currTime;

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

                    for (i in currLeaderboard) {
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

                    //update leaderboard floor
                    workingData[messageReaction.message.guildId].msgLeaderboardFloor = currLeaderboard[currLeaderboard.length - 1].score;
                }
            }
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
                mainMenu_showStats(interaction);
                break;
            
                case "openinv":
                    mainMenu_openInv(interaction);
                    break;
        
                case "trade":
                    break;
        
                case "findtreasure":
                    //Pick up edbucks button
                    mainMenu_findTreasure(interaction);
                    break;
                
                case "minigames":
                    break;
        
                case "challenge":
                    break;
        
                case "wager":
                    break;
        
                case "shop":
                    //Open shop categories
                    mainMenu_shop(interaction);
                    break;
        
                case "help":
                    //Show help text for the bot
                    mainMenu_help(interaction);
                    break;
                
                case "userleaderboard":
                    //Display leaderboard for top balance users
                    mainMenu_userLeaderboard(interaction);
                    break;
                
                case "msgleaderboard":
                    //Display leaderboard for top earning messages
                    mainMenu_msgLeaderboard(interaction);
                    break;

                case "settings":
                    break;

                case "changelog":
                    mainMenu_changelog(interaction);
                    break;
            }
            break;

        case intEventTokens.userLeaderboardNavPrefix.slice(0, -1):
            switch (eventTokens.shift()) {
                case "PREV":
                    interaction.update(openUserLeaderboard(interaction, parseInt(eventTokens.shift()) - 1));
                    break;

                case "NEXT":
                    interaction.update(openUserLeaderboard(interaction, parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        //Inventory slot select events
        case intEventTokens.playerUsablesInvSelectSlotPrefix.slice(0, -1):
            usablesInventory_selectSlot(interaction, eventTokens);
            break;

        case intEventTokens.playerUsablesInvInfoPrefix.slice(0, -1):
            switch(eventTokens.shift()) {
                case "BACK":
                    interaction.update(openUsablesInv(interaction, 0));
                    break;
                
                case "USE":
                    usableItemsFunctionalities(client, workingData, interaction, eventTokens);
                    break;
            }
            break;

        //Shop category menu events
        case intEventTokens.shopCategoryPrefix.slice(0, -1):
            switch (eventTokens.shift()) {
                case "usables":
                    //open page 1 of the usables shop
                    interaction.update(openUsablesShop(1));
                    break;
                
                case "equipment":
                    //TODO: implement equipment store
                    break;
    
                case "others":
                    //TODO: figure out what other items to implement then implement store
                    break;
            }
            break;
        
        //Usables shop shelf select events
        case intEventTokens.usablesShopSelectShelfPrefix.slice(0, -1):
            //Open window displaying selected item's purchase page
            usablesShop_selectShelf(interaction, eventTokens);
            break;

        //Usables shop nav buttons events
        case intEventTokens.usablesShopNavPagesPrefix.slice(0, -1):
            //Navigate pages of usables shop

            switch(eventTokens.shift()) {
                case "prev":
                    interaction.update(openUsablesShop(parseInt(eventTokens.shift()) - 1));
                    break;

                case "next":
                    interaction.update(openUsablesShop(parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;

        //Usables shop purchase menu events
        case intEventTokens.usablesShopPurchaseMenuPrefix.slice(0, -1):
            if (eventTokens.shift() == "BACK") {
                //Open page 1 of the usables shop if the BACK button is pressed in an item's purchase window
                interaction.update(openUsablesShop(1));
            } else {
                usablesShop_purchase(interaction, eventTokens);
            }
            break;

        //Equipment shop select shelf events 
        case intEventTokens.equipShopSelectShelfPrefix.slice(0, -1):
            break;

        case intEventTokens.changelogNavPrefix.slice(0, -1):
            switch(eventTokens.shift()){
                case "PREV":
                    interaction.update(openChangelog(parseInt(eventTokens.shift()) - 1));
                    break;

                case "NEXT":
                    interaction.update(openChangelog(parseInt(eventTokens.shift()) + 1));
                    break;
            }
            break;
    }
});

//===================================================
//all client event listeners must be before this line
//===================================================
client.login(process.env.CLIENT_TOKEN);

//===================================================
//===================================================
//
//                UTILITY FUNCTIONS
//
//===================================================
//===================================================

//return object with default values for new users in database
function getNewUserJSON(userTag, userId) {
    userObj = {
        tag: userTag,
        id: userId,
        lastAwarded: 0,
        balance: 10,
        birthday: "",
        queuedForUnmute: false,
        lastChangedMsg: {},
        itemInventory: [],
        equipmentInventory: [],
        statusEffects: [],
        equipped: {},
        settings: {},
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

function checkStatsAndEffects(interaction, targetId) {
    //instantiate return array with passed stat checks/status effects
    let passedStatsAndEffects = [];

    //get the target's data
    let targetData = workingData[interaction.guildId].users.find(obj => {
        return obj.id == targetId;
    });

    //get current time in seconds since epoch
    let currentTime = Math.floor(Date.now()/1000);

    //TODO: once equips are implemented, aggregate stats and do roll checks on them

    //check status effects and roll for checks if applicable
    let statusEffects = targetData.statusEffects;

    for (let i = 0; i < statusEffects.length; i++) {
        switch(statusEffects[i].name) {
            case "reflect":
                if (statusEffects[i].expires >= currentTime) {
                    passedStatsAndEffects.push("reflect");
                } else {
                    statusEffects.splice(i, 1);
                    i--;
                }
                break;
        }
    }

    return passedStatsAndEffects;
}

function notifCantSelfUse(interaction) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
        );
    
    interaction.update({
        content: "You can't use this item on yourself!",
        components: [row],
        ephemeral: true
    });
}

function notifTargetNotInVC(interaction) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
        );
    
    interaction.update({
        content: "Target is not in a voice call!",
        components: [row],
        ephemeral: true
    });
}

function notifDontHaveItem(interaction) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
        );
    
    interaction.update({
        content: "You don't have this item!",
        components: [row],
        ephemeral: true
    });
}

function getStatusEffectObject(name, expiration, additionalProps) {
    let returnedEffectObj = {
        name: name,
        expiration: expiration
    };

    switch (name) {
        case "reflect":
            returnedEffectObj.displayName = "Reflect";
            break;

        case "muted":
            returnedEffectObj.displayName = "Muted";
            break;

        case "polymorph":
            returnedEffectObj.displayName = "Polymorphed";
            break;
    }

    Object.assign(returnedEffectObj, additionalProps);
    return returnedEffectObj;
}

//===================================================
//===================================================
//
//                   UI BUILDERS
//
//===================================================
//===================================================

//UI builder for main menu of discord bot
function openMenu(tButtonDisabled) {
    let row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'showstats-')
            .setLabel('Show Stats')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📜'),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'openinv-')
            .setLabel('Open Inventory')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📦'),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'trade-')
            .setLabel('Trade')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤝')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'findtreasure-')
            .setLabel('Pick Up Edbucks')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💸')
            .setDisabled(tButtonDisabled ? true : false)
    );

    let row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'minigames-')
            .setLabel('Minigames')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎮')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'challenge-')
            .setLabel('Challenge')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🙌')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'wager-')
            .setLabel('Wager Edbucks')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎲')
            .setDisabled(true)
    );

    let row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'shop-')
            .setLabel('Shop')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🛒')
    );

    let row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'userleaderboard-')
            .setLabel('User Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏆'),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'msgleaderboard-')
            .setLabel('Message Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🥇'),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'settings-')
            .setLabel('Settings')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚙️')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'changelog-')
            .setLabel('Changelog')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📰'),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'help-')
            .setLabel('Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❓')
    );

    return {
        content: bold('============\nMAIN MENU\n============'),
        components: [row1, row2, row3, row4]
    };
}

//UI builder for usables shop
function openUsablesShop(pagenum) {
    if (pagenum > shopPages_usables.length || pagenum < 1) pagenum = 1;

    let pageNavRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "prev-" + pagenum)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 1)),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "pagenum")
                .setLabel("Page " + pagenum)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "next-" + pagenum)
                .setLabel("Next")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(shopPages_usables.length > pagenum))
        );
    
    let shopPage = [...shopPages_usables[pagenum - 1]];
    shopPage.push(pageNavRow);

    let shopMessage = {
        content: bold("===============\nUSABLES SHOP\n==============="),
        components: shopPage,
        ephemeral: true
    };

    return shopMessage;
}

function openUsablesInv(interaction, pageNum) {
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    let page = [];
    for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
        let row = new ActionRowBuilder();
        for (let shelfIndex = 0; shelfIndex < config.usablesInventoryItemsPerRow; shelfIndex++) {
            if (accessingUser.itemInventory[(pageNum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex] != undefined) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(intEventTokens.playerUsablesInvSelectSlotPrefix + accessingUser.itemInventory[(pageNum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex].name)
                        .setLabel(accessingUser.itemInventory[(pageNum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex].displayName)
                        .setStyle(ButtonStyle.Success)
                )
            } else {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel("Empty Space")
                        .setCustomId(intEventTokens.playerUsablesInvSelectSlotPrefix + "EMPTYSPACE-" + ((pageNum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                )
            }
        }
        page.push(row);
    }
    
    let navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerUsablesInvNavPrefix + "prev")
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum <= 0),
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerUsablesInvNavPrefix + "equips")
                .setStyle(ButtonStyle.Danger)
                .setLabel("Equips")
                .setDisabled(true),
            new ButtonBuilder()
                .setLabel("Next")
                .setCustomId(intEventTokens.playerUsablesInvNavPrefix + "next")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(accessingUser.itemInventory.length > ((pageNum + 1) * (4 * config.usablesInventoryItemsPerRow))))
        )

    page.push(navRow);

    return {
        content: bold("=========\nInventory\n=========") + underscore("\nUsables Page " + (pageNum + 1)),
        components: page,
        ephemeral: true
    }
}

function openChangelog(pageNum) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.changelogNavPrefix + "PREV-" + pageNum)
                .setDisabled(pageNum > 0 ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Prev"),
            new ButtonBuilder()
                .setCustomId(intEventTokens.changelogNavPrefix + "PAGENUM")
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Page " + (pageNum + 1)),
            new ButtonBuilder()
                .setCustomId(intEventTokens.changelogNavPrefix + "NEXT-" + pageNum)
                .setDisabled(pageNum < (changelog.length - 1) ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Next")
        )

    let changes = "";
    let version = underscore("Version: " + changelog[pageNum].version) + "\n";

    changelog[pageNum].changes.forEach(obj => {
        changes += obj + "\n";
    });
    
    return {
        content: version + codeBlock(changes),
        components: [row],
        ephemeral: true
    }
}

function openUserLeaderboard(interaction, pageNum) {
    let sortedLeaderboard = workingData[interaction.guildId].users.sort((a, b) => (a.balance > b.balance) ? -1 : 1);
    let leaderboard = "";
    let userEntriesNum = sortedLeaderboard.length;

    sortedLeaderboard = sortedLeaderboard.slice(pageNum * config.userLeaderboardEntriesPerPage, (pageNum + 1) * config.userLeaderboardEntriesPerPage);

    sortedLeaderboard.forEach((user, index) => {
        leaderboard += "(" + (index + 1 + (pageNum * config.userLeaderboardEntriesPerPage)) + ") " + user.tag + ": " + user.balance + " EB \n"
    })

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.userLeaderboardNavPrefix + "PREV-" + pageNum)
                .setDisabled(pageNum > 0 ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Prev"),
            new ButtonBuilder()
                .setCustomId(intEventTokens.userLeaderboardNavPrefix + "PAGENUM")
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Page " + (pageNum + 1)),
            new ButtonBuilder()
                .setCustomId(intEventTokens.userLeaderboardNavPrefix + "NEXT-" + pageNum)
                .setDisabled(pageNum < (Math.ceil(userEntriesNum / config.userLeaderboardEntriesPerPage) - 1) ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Next")
        );
    
    return {
        content: bold("====================\nUSER LEADERBOARD\n====================") + "\n" + leaderboard,
        components: [row],
        ephemeral: true
    }
    
}

//===================================================
//===================================================
//
//             Interaction Event Handlers
//
//===================================================
//===================================================

function mainMenu_showStats(interaction) {
    let requester = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    let lastAwarded = requester.lastAwarded > 0 ? time(requester.lastAwarded, "R") : inlineCode("Never");

    //get current time in seconds since epoch
    let currentTime = Math.floor(Date.now()/1000);

    //check status effects and roll for checks if applicable
    let statusEffects = requester.statusEffects;

    let afflictedBy = "";

    for (let i = 0; i < statusEffects.length; i++) {
        if (statusEffects[i].expires >= currentTime) {
            afflictedBy += "-(" + statusEffects[i].displayName + ") expires: " + time(statusEffects[i].expires, "R") + "\n";
        } else {
            if (statusEffects[i].name == "muted") requester.queuedForUnmute = true;
            statusEffects.splice(i, 1);
            i--;
        }
    }

    interaction.reply({
        content: `
${bold('============\nYOUR STATS\n============')}
Edbuck Balance: ${requester.balance}
Last Edbuck Awarded: ${lastAwarded}
Edbuck Reactions Awarded: ${requester.fStatReactionsAwarded}
Edbuck Reactions Received: ${requester.fStatReactionsReceived}
Status Effects:
${afflictedBy}
        `,
        ephemeral: true
    });
}

function mainMenu_openInv(interaction) {
    /*
    [Equips]
    |
    V
    head, body, accessory, shoes
    [bold("E* item1")] [Item2] [Item3]
    [Item1] [Item2] [Item3]
    [Item1] [Item2] [Item3]
    [Item1] [Item2] [Item3]
    [Prev] [Equips] [Next]
    */
    interaction.reply(openUsablesInv(interaction, 0));
}

function mainMenu_findTreasure(interaction) {
    //on click, award treasure, deactivate this button for a random amount of hours, and then reactivate
    let user = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    let treasure = Math.round(Math.random() * (config.treasureUR - config.treasureLR)) + config.treasureLR;
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
        
        let curDate = new Date(Date.now());
        console.log(`(${curDate.toLocaleString()}) Edbucks Button Looted By: ${interaction.user.tag}`);
        //set async function to wait until cooldown is over then re-enable button
        (async (menu) => {
            let timeoutDuration = Math.floor(Math.random() * (config.treasureCDUR - config.treasureCDLR)) + config.treasureCDLR;
            await setTimeout(() => menu.edit(openMenu()), timeoutDuration * 1000);
        })(result);
    });
}

function mainMenu_shop(interaction) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.shopCategoryPrefix + "usables")
                .setLabel("Usables")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intEventTokens.shopCategoryPrefix + "equipment")
                .setLabel("Equipment")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(intEventTokens.shopCategoryPrefix + "others")
                .setLabel("Others")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
        )

    interaction.reply({
        content: bold("==================\nSHOP CATEGORIES\n=================="),
        ephemeral: true,
        components: [row]
    });
}

function mainMenu_help(interaction) {
    interaction.reply({
        content:`
${bold('=====\nHELP\n=====')}

${underscore('Main Sources Of Edbucks')}
- Having people react to your messages with the :edbuck: emote awards 2 edbucks.
    - Messages can only gain edbucks within the first hour of posting.
    - You can only award edbucks once every 20 minutes at most.
- Being unmuted in a voice call with 3 or more unmuted users in it.
    - This is checked every 25 minutes and awards 1 edbuck.
- Being the first person to click on the "Pick Up Edbucks" button when it's randomly enabled.
    - Re-enables randomly between 1-2 hours after being clicked.
- Winning minigames (WIP)

${underscore('Ways To Use Your Edbucks')}
- Spend them on items in the store.
- Trade them with other players through the "Trade" button.
- Wager them against other players through the "Wager Edbucks" button.

${underscore('How To Use Purchased Items')}
1. Access your inventory through the "Open Inventory" button.
2. Click on the item you want to use.
3. Select the user you want to use the item on from the drop down menu.
        `,
        ephemeral: true
    });
}

function mainMenu_userLeaderboard(interaction) {
    interaction.reply(openUserLeaderboard(interaction, 0));
}

async function mainMenu_msgLeaderboard(interaction) {
    //populate leaderboardEntries with embed fields holding info on the leaderboard messages
    let leaderboardEntries = [];

    for (let i in workingData[interaction.guildId].msgLeaderboard) {
        //this is such a bad way to handle deleted messages xd but fuck it
        try {
            await client.channels.cache.get(workingData[interaction.guildId].msgLeaderboard[i].channelid).messages.fetch(workingData[interaction.guildId].msgLeaderboard[i].id).then(message => {
                leaderboardEntries.push(
                    {
                        name: `[${parseInt(i) + 1}] ` + underscore(workingData[interaction.guildId].msgLeaderboard[i].author + " (" + workingData[interaction.guildId].msgLeaderboard[i].score + " EB)"),
                        value: "[" + workingData[interaction.guildId].msgLeaderboard[i].snippet + "]" + "(" + message.url + ")"
                    }
                );
            });
        } catch(e) {
            leaderboardEntries.push(
                {
                    name: `[${parseInt(i) + 1}] ` + underscore(workingData[interaction.guildId].msgLeaderboard[i].author + " (" + workingData[interaction.guildId].msgLeaderboard[i].score + " EB)"),
                    value: "(Original Message Deleted)"
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
}

function mainMenu_changelog(interaction) {
    interaction.reply(openChangelog(0));
}

function usablesShop_selectShelf(interaction, eventTokens) {
    let itemName = eventTokens.shift();
    //get item display name
    let itemInfo = items.find(entry => {
        return entry.name == itemName;
    });

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopPurchaseMenuPrefix + "BACK-")
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopPurchaseMenuPrefix + "BUY-" + itemInfo.name + "-1")
                .setLabel("Purchase")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopPurchaseMenuPrefix + "BUY-" + itemInfo.name + "-5")
                .setLabel("Purchase x5")
                .setStyle(ButtonStyle.Success),
        );

    interaction.update({
        content: bold("===============\nUSABLES SHOP\n===============") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock("Description: " + itemInfo.description + "\nEffect: " + itemInfo.effect + "\nPrice: " + itemInfo.price + " EB"),
        components: [row],
        ephemeral: true
    });
}

function usablesShop_purchase(interaction, eventTokens) {

    let itemName = eventTokens.shift();
    //fetch item and customer info
    let itemInfo = items.find(obj => {
        return obj.name == itemName;
    });

    let customer = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //get purchase count from event tokens
    let pCount = parseInt(eventTokens.shift());

    //do a balance check for the customer
    if (customer.balance < (itemInfo.price * pCount)) {
        interaction.reply({
            content: "Insufficient Edbucks!",
            ephemeral: true
        });
        return;
    }

    //deduct balance and give customer the purchased item(s)
    customer.balance -= (itemInfo.price * pCount);

    let existingInventoryEntry = customer.itemInventory.find(obj => {
        return obj.name == itemInfo.name;
    });

    if (existingInventoryEntry) {
        existingInventoryEntry.count += pCount;
    } else {
        let newItemEntry = {...itemInfo};
        newItemEntry.count = pCount;
        customer.itemInventory.push(newItemEntry);
    }

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopPurchaseMenuPrefix + "BACK-")
                .setStyle(ButtonStyle.Danger)
                .setLabel("Back")
        )

    interaction.update({
        content: bold("===================\nPurchase Complete!\n===================\nObtained " + pCount + "x " + itemInfo.displayName + ".\nLost " + (pCount*itemInfo.price) + " EB."),
        ephemeral: true,
        components: [row]
    });
}

function usablesInventory_selectSlot(interaction, eventTokens) {
    let itemName = eventTokens.shift();
    //get user data
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //get item display name
    let itemInfo = accessingUser.itemInventory.find(entry => {
        return entry.name == itemName;
    });

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK-")
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + itemInfo.name)
                .setLabel("Use")
                .setStyle(ButtonStyle.Success)
        );

    interaction.update({
        content: bold("===================\nUSABLES INVENTORY\n===================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock("Description: " + itemInfo.description + "\nEffect: " + itemInfo.effect + "\nCount: " + itemInfo.count),
        components: [row],
        ephemeral: true
    });
}
