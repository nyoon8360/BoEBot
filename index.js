require('dotenv').config();
const { Client, IntentsBitField, ButtonStyle, time, ActionRowBuilder, ButtonBuilder, parseEmoji, inlineCode, bold, underscore, Options, Sweepers, EmbedBuilder, italic, codeBlock, TextInputBuilder, TextInputStyle, GuildScheduledEventPrivacyLevel, MentionableSelectMenuBuilder, userMention, ModalBuilder, ClientVoiceManager, UserSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const items = require('./items.json');
const equipment = require('./equipment.json');
const changelog = require('./changelog.json');

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
            "equipmentInventory": [
                {
                    "name": "mirror_ring",
                    "equipped": true
                }
            ],
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

//common config consts
const reactCooldown = config.common.reactCooldown; //how long users must wait in between awarding edbucks in seconds
const msgExpiration = config.common.msgExpiration; //how long a message can be awarded edbucks for in seconds
const reactAward = config.common.reactAward; //how many edbucks awarded for reactions
const treasureLR = config.common.treasureLowerRange; //min possible number of edbucks found on pressing "Pick Up Edbucks" button
const treasureUR = config.common.treasureUpperRange; //max possible number of edbucks found on pressing "Pick Up Edbucks" button
const treasureCDLR = config.common.treasureCooldownLowerRange; //min possible number of seconds the "Pick Up Edbucks" button will be disabled for
const treasureCDUR = config.common.treasureCooldownUpperRange; //max possible number of seconds the "Pick Up Edbucks" button will be disabled for
const userLeaderboardLimit = config.common.userLeaderboardLimit; //max number of entries that will show on the user leaderboard
const msgLeaderboardLimit = config.common.msgLeaderboardLimit; //max number of entries that will show on the message leaderboard
const currencyEmojiName = config.common.currencyEmojiName; //the name of the emoji used to award currency
const botAdmins = config.common.admins; //list of user tags that are able to run admin commands for the bot
const saveInterval = config.common.saveInterval; //the interval between json file autosaves
const usablesShopItemsPerRow = config.common.usablesShopItemsPerRow > 5 ? 5 : config.common.usablesShopItemsPerRow; //the number of items displayed per row in the item shop. maxed at 5
const usablesInventoryItemsPerRow = config.common.usablesInventoryItemsPerRow > 5 ? 5 : config.common.usablesInventoryItemsPerRow; //number of items displayed per row in player inventories. maxed at 5
const botNotifsChannelId = config.common.botNotifsChannelId;

//item config consts
const itemMuteDuration = config.items.itemMuteDuration;
const itemReflectDuration = config.items.itemReflectDuration;
const itemPolymorphDuration = config.items.itemPolymorphDuration;
const itemTimeoutDuration = config.items.itemTimeoutDuration;
const itemEMPDuration = config.items.itemEMPDuration;

//===================================================
//             Interact Event Tokens
//===================================================
//String tokens to be sent on emitted interact events that will be parsed and handled accordingly by event handlers

//Common tokens
const intMainMenuPrefix = "MAINMENU-";
const intShopCategoryPrefix = "SELECTSHOPCATEGORY-";

//Usables shop tokens
const intUsablesShopSelectShelfPrefix = "USABLESSHOPSELECTSHELF-";
const intUsablesShopPurchaseMenuPrefix = "USABLESSHOPPURCHASEMENU-";
const intUsablesShopNavPagesPrefix = "USABLESSHOPNAVPAGES-";

//Equip shop tokens
const intEquipShopSelectShelfPrefix = "EQUIPSHOPSELECTSHELF-";

//Others shop tokens
const intOtherShopSelectShelfPrefix = "OTHERSHOPSELECTSHELF-";

//Player usables inventory tokens
const intPlayerUsablesInvSelectSlotPrefix = "PUSABLESINVSELECTSLOT-";
const intPlayerUsablesInvInfoPrefix = "PUSABLESINVINFO-"
const intPlayerUsablesInvNavPrefix = "PUSABLESINVNAV-";


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
                guildUsersArray.push({
                    tag: gMember.user.tag,
                    id: gMember.id
                });
            });

            guildUsersArray.filter(user => !existingArray.includes(user.tag)).forEach((newUser) => {
                workingData[guildId].users.push(getNewUserJSON(newUser.tag, newUser.id));
            });

            fs.writeFileSync('./database' + guildId + ".json", JSON.stringify(workingData[guildId], null, 2));
        }).catch(console.error);
        
    });

    
    //Populate usables shop pages
    for (let pageIndex = 0; pageIndex < Math.ceil(items.length / (4 * usablesShopItemsPerRow)); pageIndex++) {
        let newPage = [];
        for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
            let row = new ActionRowBuilder();
            for (let shelfIndex = 0; shelfIndex < usablesShopItemsPerRow; shelfIndex++) {
                if (items[(pageIndex * (4 * usablesShopItemsPerRow)) + (rowIndex * usablesShopItemsPerRow) + shelfIndex] != undefined) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(intUsablesShopSelectShelfPrefix + items[(pageIndex * (4 * usablesShopItemsPerRow)) + (rowIndex * usablesShopItemsPerRow) + shelfIndex].name)
                            .setLabel(items[(pageIndex * (4 * usablesShopItemsPerRow)) + (rowIndex * usablesShopItemsPerRow) + shelfIndex].displayName)
                            .setStyle(ButtonStyle.Success)
                    )
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel("Empty Shelf")
                            .setCustomId(intUsablesShopSelectShelfPrefix + "EMPTYSHELF-" + ((pageIndex * (4 * usablesShopItemsPerRow)) + (rowIndex * usablesShopItemsPerRow) + shelfIndex))
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
        console.log((Date.now()/1000) + " (Epoch Seconds Timestamp): Autosave Complete!");
    }, saveInterval * 1000);

    console.log(`${client.user.tag} is ready!`);
});

//on new guild user join, add entry to database if not already existing
client.on("guildMemberAdd", member => {
    let existingEntry = workingData[member.guild.id].users.find(entry => {
        entry.tag == member.user.tag
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

//listen for updates on guild members
client.on('guildMemberUpdate', (oldMember, newMember) => {
    //enforce polymorph status effect on those afflicted

    //check if the member update was to nickname
    if (oldMember.displayName != newMember.displayName) {
        //get member data and existing polymorph status effect on member if it exists
        let memberData = workingData[newMember.guild.id].users.find(obj => {
            return obj.tag == newMember.user.tag;
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
        return obj.tag == message.author.tag;
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
        return obj.tag == newMessage.author.tag;
    });

    messageAuthorData.lastChangedMsg = {
        time: Math.floor(newMessage.createdTimestamp/1000),
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        channel: newMessage.channel.id
    };
})

client.on('messageReactionAdd', (messageReaction, user) => {
    //base system for awarding edbucks to users whose msgs get edbuck reactions
    if (messageReaction.emoji.name != 'edbuck') return;
    if (!messageReaction.message.guildId) return;

    //If the reactor and the reacted to are the same person then dont award anything.
    if (user.tag == messageReaction.message.author.tag) return;

    //do a time check for the reactor
    let storedUserData = workingData[messageReaction.message.guildId].users.find(obj => {
        return obj.tag == user.tag;
    })

    let currTime = Math.floor(Date.now() / 1000);

    if (currTime - storedUserData.lastAwarded >= reactCooldown) {

        //do a time check for the reacted to message
        if (currTime - Math.floor(messageReaction.message.createdTimestamp/1000) <= msgExpiration) {
            //find recipient user's data object in working data var
            let recipient = workingData[messageReaction.message.guildId].users.find(obj => {
                return obj.tag == messageReaction.message.author.tag;
            });

            //award recipient edbucks
            recipient.balance += reactAward;

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

                let messageSnippet = (messageReaction.message.embeds.length || messageReaction.message.attachments.size) ? "MEDIA POST" : messageReaction.message.content.length > 20 ? messageReaction.message.content.substring(0, 17) + "...": messageReaction.message.content.substring(0, 20);

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
        case intMainMenuPrefix.slice(0, -1):
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
                    break;c
            }
            break;

        //Inventory slot select events
        case intPlayerUsablesInvSelectSlotPrefix.slice(0, -1):
            usablesInventory_selectSlot(interaction, eventTokens);
            break;

        case intPlayerUsablesInvInfoPrefix.slice(0, -1):
            switch(eventTokens.shift()) {
                case "BACK":
                    interaction.update(openUsablesInv(interaction, 0));
                    break;
                
                case "USE":
                    usableItemsFunctionalities(interaction, eventTokens);
                    break;
            }
            break;

        //Shop category menu events
        case intShopCategoryPrefix.slice(0, -1):
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
        case intUsablesShopSelectShelfPrefix.slice(0, -1):
            //Open window displaying selected item's purchase page
            usablesShop_selectShelf(interaction, eventTokens);
            break;

        //Usables shop nav buttons events
        case intUsablesShopNavPagesPrefix.slice(0, -1):
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
        case intUsablesShopPurchaseMenuPrefix.slice(0, -1):
            if (eventTokens.shift() == "BACK") {
                //Open page 1 of the usables shop if the BACK button is pressed in an item's purchase window
                interaction.update(openUsablesShop(1));
            } else {
                usablesShop_purchase(interaction, eventTokens);
            }
            break;

        //Equipment shop select shelf events 
        case intEquipShopSelectShelfPrefix.slice(0, -1):
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

function checkStatsAndEffects(interaction, targetTag) {
    //instantiate return array with passed stat checks/status effects
    let passedStatsAndEffects = [];

    //get the target's data
    let targetData = workingData[interaction.guildId].users.find(obj => {
        return obj.tag == targetTag;
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

function preventSelfUse(interaction) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
        );
    
    interaction.update({
        content: "You can't use this item on yourself!",
        components: [row],
        ephemeral: true
    });
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
            .setCustomId(intMainMenuPrefix + 'showstats-')
            .setLabel('Show Stats')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📜'),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'openinv-')
            .setLabel('Open Inventory')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📦'),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'trade-')
            .setLabel('Trade')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤝')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'findtreasure-')
            .setLabel('Pick Up Edbucks')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💸')
            .setDisabled(tButtonDisabled ? true : false)
    );

    let row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'minigames-')
            .setLabel('Minigames')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎮')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'challenge-')
            .setLabel('Challenge')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🙌')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'wager-')
            .setLabel('Wager Edbucks')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎲')
            .setDisabled(true)
    );

    let row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'shop-')
            .setLabel('Shop')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🛒')
    );

    let row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'userleaderboard-')
            .setLabel('User Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏆'),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'msgleaderboard-')
            .setLabel('Message Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🥇'),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'settings-')
            .setLabel('Settings')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚙️'),
        new ButtonBuilder()
            .setCustomId(intMainMenuPrefix + 'help-')
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
                .setCustomId(intUsablesShopNavPagesPrefix + "prev-" + pagenum)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 1)),
            new ButtonBuilder()
                .setCustomId(intUsablesShopNavPagesPrefix + "pagenum")
                .setLabel("Page " + pagenum)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(intUsablesShopNavPagesPrefix + "next-" + pagenum)
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
        return obj.tag == interaction.user.tag;
    });

    let page = [];
    for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
        let row = new ActionRowBuilder();
        for (let shelfIndex = 0; shelfIndex < usablesInventoryItemsPerRow; shelfIndex++) {
            if (accessingUser.itemInventory[(pageNum * (4 * usablesInventoryItemsPerRow)) + (rowIndex * usablesInventoryItemsPerRow) + shelfIndex] != undefined) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(intPlayerUsablesInvSelectSlotPrefix + accessingUser.itemInventory[(pageNum * (4 * usablesInventoryItemsPerRow)) + (rowIndex * usablesInventoryItemsPerRow) + shelfIndex].name)
                        .setLabel(accessingUser.itemInventory[(pageNum * (4 * usablesInventoryItemsPerRow)) + (rowIndex * usablesInventoryItemsPerRow) + shelfIndex].displayName)
                        .setStyle(ButtonStyle.Success)
                )
            } else {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel("Empty Space")
                        .setCustomId(intPlayerUsablesInvSelectSlotPrefix + "EMPTYSPACE-" + ((pageNum * (4 * usablesInventoryItemsPerRow)) + (rowIndex * usablesInventoryItemsPerRow) + shelfIndex))
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
                .setCustomId(intPlayerUsablesInvNavPrefix + "prev")
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum <= 0),
            new ButtonBuilder()
                .setCustomId(intPlayerUsablesInvNavPrefix + "equips")
                .setStyle(ButtonStyle.Danger)
                .setLabel("Equips")
                .setDisabled(true),
            new ButtonBuilder()
                .setLabel("Next")
                .setCustomId(intPlayerUsablesInvNavPrefix + "next")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(accessingUser.itemInventory.length > ((pageNum + 1) * (4 * usablesInventoryItemsPerRow))))
        )

    page.push(navRow);

    return {
        content: bold("=========\nInventory\n=========") + underscore("\nUsables Page " + (pageNum + 1)),
        components: page,
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
        return obj.tag == interaction.user.tag;
    });

    let lastAwarded = requester.lastAwarded > 0 ? time(requester.lastAwarded, "R") : inlineCode("Never");

    interaction.reply({
        content: `
${bold('============\nYOUR STATS\n============')}
Edbuck Balance: ${requester.balance}
Last Edbuck Awarded: ${lastAwarded}
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
}

function mainMenu_shop(interaction) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intShopCategoryPrefix + "usables")
                .setLabel("Usables")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intShopCategoryPrefix + "equipment")
                .setLabel("Equipment")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(intShopCategoryPrefix + "others")
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
- Having people react to your messages with the :edbuck: emote.
- Being the first person to click on the "Pick Up Edbucks" button when it's randomly enabled.
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
    let sortedLeaderboard = workingData[interaction.guildId].users.sort((a, b) => (a.balance > b.balance) ? -1 : 1);
    let leaderboard = "";

    sortedLeaderboard = sortedLeaderboard.slice(0, userLeaderboardLimit);

    sortedLeaderboard.forEach((user, index) => {
        leaderboard += "(" + (index + 1) + ") " + user.tag + ": " + user.balance + " EB \n"
    })

    interaction.reply({
        content: bold("====================\nUSER LEADERBOARD\n====================") + "\n" + leaderboard,
        ephemeral: true
    })
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

function usablesShop_selectShelf(interaction, eventTokens) {
    let itemName = eventTokens.shift();
    //get item display name
    let itemInfo = items.find(entry => {
        return entry.name == itemName;
    });

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intUsablesShopPurchaseMenuPrefix + "BACK-")
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intUsablesShopPurchaseMenuPrefix + "BUY-" + itemInfo.name + "-1")
                .setLabel("Purchase")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(intUsablesShopPurchaseMenuPrefix + "BUY-" + itemInfo.name + "-5")
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
        return obj.tag == interaction.user.tag;
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
                .setCustomId(intUsablesShopPurchaseMenuPrefix + "BACK-")
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
        return obj.tag == interaction.user.tag;
    });

    //get item display name
    let itemInfo = accessingUser.itemInventory.find(entry => {
        return entry.name == itemName;
    });

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK-")
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + itemInfo.name)
                .setLabel("Use")
                .setStyle(ButtonStyle.Success)
        );

    interaction.update({
        content: bold("===================\nUSABLES INVENTORY\n===================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock("Description: " + itemInfo.description + "\nEffect: " + itemInfo.effect + "\nCount: " + itemInfo.count),
        components: [row],
        ephemeral: true
    });
}

//===================================================
//===================================================
//
//        Item Functionalities Implementations
//
//===================================================
//===================================================

//All code relating to the functionalities of usable items
function usableItemsFunctionalities(interaction, eventTokens) {
    switch(eventTokens.shift()) {
        case "item_kick":
            if (eventTokens.length <= 0) {
                //select target
                let row = new ActionRowBuilder()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_kick-" + "targetted")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .setPlaceholder("Choose a target.")
                    )

                interaction.update({
                    content: underscore("Select a target for: Comically Large Boot"),
                    components: [row],
                    ephemeral: true
                });
            } else {
                //get target data
                let target = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

                //prevent self use
                if (target.user.tag == interaction.user.tag) {
                    preventSelfUse(interaction);
                    return;
                }

                //do stats and effects check
                let passedModifiers = checkStatsAndEffects(interaction, target.user.tag);

                //consume item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_kick";
                });

                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                //instantiate server/caster notification message
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${target.nickname ? `${target.nickname}(${target.user.tag})` : target.user.tag}`;
                let sNotifMsg = `${casterString} has used a Comically Large Boot on ${targetString}.`;
                let cNotifMsg = "You've used a Comically Large Boot on " + userMention(interaction.values[0]) + ".";

                //handle passed modifiers
                passedModifiers.forEach(effect => {
                    switch (effect) {
                        case "reflect":
                            target = interaction.member;
                            sNotifMsg = `${casterString} has used a Comically Large Boot on ${targetString} but it was reflected.`;
                            cNotifMsg = "You've used a Comically Large Boot on " + userMention(interaction.values[0]) + " but it was reflected."
                            break;
                    }
                });

                //ennact item effect
                target.voice.disconnect();

                //Send notification message to bot notifs channel
                interaction.member.guild.channels.cache.get(botNotifsChannelId).send({
                    content: sNotifMsg
                });

                //update UI
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                    );
                
                interaction.update({
                    content: cNotifMsg,
                    components: [row],
                    ephemeral: true
                });
            }
            break;
        
        case "item_mute":
            if (eventTokens.length <= 0) {
                //select target
                let row = new ActionRowBuilder()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_mute-" + "targetted")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .setPlaceholder("Choose a target.")
                    )

                interaction.update({
                    content: underscore("Select a target for: Duct Tape"),
                    components: [row],
                    ephemeral: true
                });
            } else {
                //get target data
                let target = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

                //prevent self use
                if (target.user.tag == interaction.user.tag) {
                    preventSelfUse(interaction);
                    return;
                }

                //do stats and effects check
                let passedModifiers = checkStatsAndEffects(interaction, target.user.tag);

                //consume item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_mute";
                });

                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                //instantiate server/caster notification message
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${target.nickname ? `${target.nickname}(${target.user.tag})` : target.user.tag}`;
                let sNotifMsg = `${casterString} has used Duct Tape on ${targetString}.`;
                let cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + ".";

                //handle passed modifiers
                passedModifiers.forEach(effect => {
                    switch (effect) {
                        case "reflect":
                            target = interaction.member;
                            sNotifMsg = `${casterString} has used Duct Tape on ${targetString} but it was reflected.`;
                            cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + " but it was reflected."
                            break;
                    }
                });
                
                //enact item effect
                target.voice.setMute(true);

                (async (mutedTarget) => {
                    let timeoutDuration = itemMuteDuration;
                    await setTimeout(() => mutedTarget.voice.setMute(false), timeoutDuration * 1000);
                })(target)

                //send msg to notifs channel
                interaction.member.guild.channels.cache.get(botNotifsChannelId).send({
                    content: sNotifMsg
                });

                //update UI
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                    );
                
                interaction.update({
                    content: cNotifMsg,
                    components: [row],
                    ephemeral: true
                });
            }
            break;
        
        case "item_steal":
            if (eventTokens.length <= 0) {
                //select target
                let row = new ActionRowBuilder()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_steal-" + "targetted")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .setPlaceholder("Choose a target.")
                    )

                interaction.update({
                    content: underscore("Select a target for: Goose with a Knife"),
                    components: [row],
                    ephemeral: true
                });
            } else {
                //get target data
                let targetMemberObject = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

                //prevent self use
                if (targetMemberObject.user.tag == interaction.user.tag) {
                    preventSelfUse(interaction);
                    return;
                }

                //do stats and effects check
                let passedModifiers = checkStatsAndEffects(interaction, targetMemberObject.user.tag);

                //consume item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_steal";
                });

                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                //instantiate server/caster notification message
                let reflected = false;
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${targetMemberObject.nickname ? `${targetMemberObject.nickname}(${targetMemberObject.user.tag})` : targetMemberObject.user.tag}`;
                let sNotifMsg = "";
                let cNotifMsg = "";

                //handle passed modifiers
                passedModifiers.forEach(effect => {
                    switch (effect) {
                        case "reflect":
                            reflected = true;
                            break;
                    }
                });
                
                //enact item effect
                let randomInvSlot;
                let targettedData = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == (reflected ? interaction.user.tag : targetMemberObject.user.tag);
                });
                let targettedInv = targettedData.itemInventory;

                let randomStealList = [
                    "kidney", "liver", "leg", "wallet", "pokemon card collection", "V-bucks", "toes"
                ];

                if (targettedInv.length > 0 && !reflected) {
                    //item inventory NOT empty AND item NOT reflected
                    randomInvSlot = Math.round(Math.random() * (targettedInv.length - 1));
                    let stolenItem = targettedInv[randomInvSlot];
                    if (targettedInv[randomInvSlot].count > 1) {
                        targettedInv[randomInvSlot].count -= 1;
                    } else {
                        targettedInv.slice(randomInvSlot, 1);
                    }

                    let existingItemEntry = caster.itemInventory.find(obj => {
                        return obj.name == stolenItem.name;
                    });

                    if (existingItemEntry) {
                        existingItemEntry.count += 1;
                    } else {
                        let newItemEntry = {...stolenItem};
                        newItemEntry.count = 1;
                        caster.itemInventory.push(newItemEntry);
                    }

                    cNotifMsg = "You've used a Goose with a Knife on " + userMention(interaction.values[0]) + " and stole 1x " + stolenItem.displayName + ".";
                    sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString}.`;
                } else if (targettedInv.length > 0 && reflected) {
                    //item inventory NOT empty and item IS reflected
                    randomInvSlot = Math.round(Math.random() * (targettedInv.length - 1));
                    let stolenItem = targettedInv[randomInvSlot];
                    if (targettedInv[randomInvSlot].count > 1) {
                        targettedInv[randomInvSlot].count -= 1;
                    } else {
                        targettedInv.slice(randomInvSlot, 1);
                    }

                    let targetWorkingDataObj = workingData[interaction.guildId].users.find(obj => {
                        return obj.tag == targetMemberObject.user.tag;
                    });

                    let existingItemEntry = targetWorkingDataObj.itemInventory.find(obj => {
                        return obj.name == stolenItem.name;
                    });

                    if (existingItemEntry) {
                        existingItemEntry.count += 1;
                    } else {
                        let newItemEntry = {...stolenItem};
                        newItemEntry.count = 1;
                        targetWorkingDataObj.itemInventory.push(newItemEntry);
                    }

                    cNotifMsg = "You've used a Goose with a Knife on " + userMention(interaction.values[0]) + " but it was reflected (paid off). Now you're missing 1x " + stolenItem.displayName + ".";
                    sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but it was reflected (paid off).`;

                } else if (targettedInv.length <= 0 && !reflected) {
                    //item inventory IS empty and item is NOT reflected
                    let randomStolenItem = randomStealList[Math.round(Math.random() * (randomStealList.length - 1))];

                    caster.balance += 1;

                    cNotifMsg = `You've used a Goose with a Knife on ${userMention(interaction.values[0])} but there was nothing to steal so it just took his ${randomStolenItem} and sold it on the black market. He gave you a 1 Edbuck cut.`;
                    sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but there was nothing to steal so it took his ${randomStolenItem} and sold it on the black market.`;
                } else {
                    //item inventory IS empty and item IS reflected
                    let randomStolenItem = randomStealList[Math.round(Math.random() * (randomStealList.length - 1))];

                    targettedData.balance += 1;

                    cNotifMsg = `You've used a Goose with a Knife on ${userMention(interaction.values[0])} but it was reflected. There was nothing to steal so it just took your ${randomStolenItem} and sold it on the black market. It gave him a 1 Edbuck cut.`;
                    sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but it was reflected. There was nothing to steal so it just took his ${randomStolenItem} and sold it on the black market.`;
                }

                //send msg to notifs channel
                interaction.member.guild.channels.cache.get(botNotifsChannelId).send({
                    content: sNotifMsg
                });

                //update UI
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                    );
                
                interaction.update({
                    content: cNotifMsg,
                    components: [row],
                    ephemeral: true
                });
            }
            break;

        case "item_deleteMsg":
            //temporarily canceled due to current plans for implementation nuking performance and the fact that this item will most likely rarely be used
            /*
                {
                    "name": "item_deleteMsg",
                    "displayName": "Bottle of Whiteout",
                    "description": "Use it to erase someone's message...or huff it to get high. We dont judge.",
                    "effect": "Deletes the last sent message of a specified user.",
                    "price": 5
                },
            */
            break;

        case "item_polymorph":
            let nextToken = eventTokens.shift();
            if (!nextToken) {
                //select polymorph target
                let row = new ActionRowBuilder()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_polymorph-" + "targetted")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .setPlaceholder("Choose a target.")
                    )

                interaction.update({
                    content: underscore("Select a target for: Semi-permanent Nametag"),
                    components: [row],
                    ephemeral: true
                });

            } else if (nextToken == "targetted") {
                //input polymorph name
                let modal = new ModalBuilder()
                    .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_polymorph-" + interaction.values[0])
                    .setTitle("Semi-permanent Nametag")
                    .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("newNickname")
                            .setStyle(TextInputStyle.Short)
                            .setLabel("New Nickname")
                    )
                )

                interaction.showModal(modal);
            } else {
                //get target and new nickname
                let newNickname = interaction.fields.getTextInputValue('newNickname');
                let target = client.guilds.cache.get(interaction.guildId).members.cache.get(nextToken);

                //prevent self use
                if (target.user.tag == interaction.user.tag) {
                    preventSelfUse(interaction);
                    return;
                }

                //do stats and effects check
                let passedModifiers = checkStatsAndEffects(interaction, target.user.tag);

                //consume item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_polymorph";
                });

                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                //instantiate server/caster notification message
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${target.nickname ? `${target.nickname}(${target.user.tag})` : target.user.tag}`;
                let sNotifMsg = `${casterString} has used Semi-permanent Nametag on ${targetString}.`;
                let cNotifMsg = "You've used Semi-permanent Nametag on " + userMention(nextToken) + ".";

                //handle passed modifiers
                passedModifiers.forEach(effect => {
                    switch (effect) {
                        case "reflect":
                            target = interaction.member;
                            sNotifMsg = `${casterString} has used Semi-permanent Nametag on ${targetString} but it was reflected.`;
                            cNotifMsg = "You've used Semi-permanent Nametag on " + userMention(nextToken) + " but it was reflected."
                            break;
                    }
                });
                
                //apply polymorph status effect
                let targetData = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == target.user.tag;
                });

                let existingStatusEffect = targetData.statusEffects.find(obj => {
                    obj.name == "polymorph";
                });

                if (existingStatusEffect) {
                    existingStatusEffect.expires = Math.floor(Date.now()/1000) + itemPolymorphDuration;
                    existingStatusEffect.polyName = newNickname;
                } else {
                    targetData.statusEffects.push({
                        name: "polymorph",
                        expires: Math.floor(Date.now()/1000) + itemPolymorphDuration,
                        polyName: newNickname
                    });
                }

                //enact item effects
                target.setNickname(newNickname);

                //send msg to notifs channel
                interaction.member.guild.channels.cache.get(botNotifsChannelId).send({
                    content: sNotifMsg
                });

                //update UI
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                    );
                
                interaction.update({
                    content: cNotifMsg,
                    components: [row],
                    ephemeral: true
                });
            }
            break;

        case "item_reflect":
            //get caster's data entry
            let casterData = workingData[interaction.guildId].users.find(obj => {
                return obj.tag == interaction.user.tag;
            });

            //apply reflect status effect
            let existingStatusEffect = casterData.statusEffects.find(obj => {
                obj.name == "reflect";
            });

            if (existingStatusEffect) {
                existingStatusEffect.expires = Math.floor(Date.now()/1000) + itemReflectDuration;
            } else {
                casterData.statusEffects.push({
                    name: "reflect",
                    expires: Math.floor(Date.now()/1000) + itemReflectDuration
                });
            }

            //consume item
            let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
                return obj.name == "item_reflect";
            });

            if (casterData.itemInventory[itemEntryIndex].count == 1) {
                casterData.itemInventory.splice(itemEntryIndex, 1);
            } else {
                casterData.itemInventory[itemEntryIndex].count -= 1;
            }

            //update UI
            let row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Back")
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                );
            
            interaction.update({
                content: "You've used a \"no u\".",
                components: [row],
                ephemeral: true
            });
            break;

        case "item_expose":
            //lastChangedMsg
            if (eventTokens.length <= 0) {
                //select target
                let row = new ActionRowBuilder()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_expose-" + "targetted")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .setPlaceholder("Choose a target.")
                    )

                interaction.update({
                    content: underscore("Select a target for: 4K HD Wide-angle Lens Camera"),
                    components: [row],
                    ephemeral: true
                });
            } else {
                //get target data
                let targetMemberData = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

                let targetData = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == targetMemberData.user.tag;
                })

                //consume item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_expose";
                });

                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                let passedModifiers = checkStatsAndEffects(interaction, targetData.tag);

                //instantiate server/caster notification message
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${targetMemberData.nickname ? `${targetMemberData.nickname}(${targetMemberData.user.tag})` : targetMemberData.user.tag}`;
                let sNotifMsg = `${casterString} has used 4K HD Wide-angle Lens Camera on ${targetString}.`;
                let cNotifMsg = "You've used 4K HD Wide-angle Lens Camera on " + userMention(interaction.values[0]) + ".";
                let reflected = false;

                //handle passed modifiers
                passedModifiers.forEach(effect => {
                    switch (effect) {
                        case "reflect":
                            targetData = caster;
                            sNotifMsg = `${casterString} has used Duct Tape on ${targetString} but it was reflected.`;
                            cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + " but it was reflected."
                            reflected = true;
                            break;
                    }
                });

                let exposedMsg = targetData.lastChangedMsg;
                let embed;

                if (exposedMsg) {
                    embed = new EmbedBuilder()
                        .setAuthor({name: reflected ? casterString : targetString, iconURL: reflected ? interaction.member.avatarURL() : targetMemberData.avatarURL()})
                        .setTitle("Time Sent")
                        .setDescription(time(exposedMsg.time,"F"))
                
                    if (exposedMsg.newContent) {
                        embed.addFields(
                            {name: "Old Message", value: exposedMsg.oldContent},
                            {name: "New Message", value: exposedMsg.newContent}
                        )
                    } else {
                        embed.addFields(
                            {name: "Deleted Message", value: exposedMsg.oldContent}
                        )
                    }
                } else {
                    embed = new EmbedBuilder()
                        .setAuthor(reflected ? casterString : targetString)
                        .setTitle("Modified Message")
                        .setDescription("No Message To Expose")
                        .addFields({
                            name: "No Message To Expose"
                        })
                }

                client.guilds.cache.get(interaction.guildId).channels.cache.get(exposedMsg.channel).send({
                    embeds: [embed]
                });

                //send msg to notifs channel
                interaction.member.guild.channels.cache.get(botNotifsChannelId).send({
                    content: sNotifMsg
                });

                //update UI
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                    );
                
                interaction.update({
                    content: cNotifMsg,
                    components: [row],
                    ephemeral: true
                });
            }
            break;

        case "item_edwindinner":
            if (eventTokens.length <= 0) {
                //select target
                let row = new ActionRowBuilder()
                    .addComponents(
                        new MentionableSelectMenuBuilder()
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_edwindinner-" + "targetted")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .setPlaceholder("Choose a target.")
                    )

                interaction.update({
                    content: underscore("Select a target for: Edwin Dinner™"),
                    components: [row],
                    ephemeral: true
                });
            } else {
                //get target data
                let target = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

                //prevent self use
                if (target.user.tag == interaction.user.tag) {
                    preventSelfUse(interaction);
                    return;
                }

                //do stats and effects check
                let passedModifiers = checkStatsAndEffects(interaction, target.user.tag);

                //consume item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_edwindinner";
                });

                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                //instantiate server/caster notification message
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${target.nickname ? `${target.nickname}(${target.user.tag})` : target.user.tag}`;
                let sNotifMsg = `${casterString} has used Edwin Dinner™ on ${targetString}.`;
                let cNotifMsg = "You've used Edwin Dinner™ on " + userMention(interaction.values[0]) + ".";

                //handle passed modifiers
                passedModifiers.forEach(effect => {
                    switch (effect) {
                        case "reflect":
                            target = interaction.member;
                            sNotifMsg = `${casterString} has used Edwin Dinner™ on ${targetString} but it was reflected.`;
                            cNotifMsg = "You've used Edwin Dinner™ on " + userMention(interaction.values[0]) + " but it was reflected."
                            break;
                    }
                });
                
                //enact item effect
                target.timeout(itemTimeoutDuration * 1000);

                //send msg to notifs channel
                interaction.member.guild.channels.cache.get(botNotifsChannelId).send({
                    content: sNotifMsg
                });

                //update UI
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                    );
                
                interaction.update({
                    content: cNotifMsg,
                    components: [row],
                    ephemeral: true
                });
            }
            break;


        case "item_emp":
            //TODO: Implement
            if (eventTokens.length <= 0) {
                //select target
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "USE-" + "item_emp-" + "targetted")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .setPlaceholder("Choose a target.")
                            .setChannelTypes([ChannelType.GuildVoice])
                    )

                interaction.update({
                    content: underscore("Select a target for: 150 Tech-savy Apes"),
                    components: [row],
                    ephemeral: true
                });
            } else {
                //get targetted channel
                let target = interaction.channels.get(interaction.values[0]);

                //consume item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_emp";
                });

                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                //instantiate server/caster notification message
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${target.name}`;
                let sNotifMsg = `${casterString} has used 150 Tech-savy Apes on voice channel: ${targetString}.`;
                let cNotifMsg = "You've used Tech-savy Apes on the voice channel: " + targetString + ".";
                
                //enact item effect
                target.setBitrate(8000);

                (async (targetChannel) => {
                    let timeoutDuration = itemEMPDuration;
                    await setTimeout(() => {
                        targetChannel.setBitrate(64000);
                    }, timeoutDuration * 1000);
                })(target)

                //send msg to notifs channel
                interaction.member.guild.channels.cache.get(botNotifsChannelId).send({
                    content: sNotifMsg
                });

                //update UI
                let row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(intPlayerUsablesInvInfoPrefix + "BACK")
                    );
                
                interaction.update({
                    content: cNotifMsg,
                    components: [row],
                    ephemeral: true
                });
            }
            break;
    }
}