const { Client, IntentsBitField, ButtonStyle, time, ActionRowBuilder, ButtonBuilder, inlineCode, bold, underscore, Options, EmbedBuilder, codeBlock, TextInputBuilder, TextInputStyle, MentionableSelectMenuBuilder, userMention, ModalBuilder, UserSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, DiscordAPIError } = require('discord.js');
const fs = require('fs');
const usables = require('../items/usables.json');
const intEventTokens = require('../constants/intEventTokens.js');
const config = require('../constants/configConsts.js');

//===================================================
//===================================================
//
//             Interaction Event Handlers
//
//===================================================
//===================================================

function mainMenu_showStats(workingData, interaction) {
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

function mainMenu_findTreasure(workingData, interaction) {
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

async function mainMenu_msgLeaderboard(client, workingData, interaction) {
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
    let itemInfo = usables.find(entry => {
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

function usablesShop_purchase(workingData, interaction, eventTokens) {

    let itemName = eventTokens.shift();
    //fetch item and customer info
    let itemInfo = usables.find(obj => {
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

function usablesInventory_selectSlot(workingData, interaction, eventTokens) {
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