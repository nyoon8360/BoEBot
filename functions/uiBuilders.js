const { ButtonStyle, ActionRowBuilder, ButtonBuilder, EmbedBuilder, bold, time, underscore, codeBlock, inlineCode, userMention} = require('discord.js');
const changelogPages = require('../pages/changelog.json');
const config = require('../constants/configConsts.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const utils = require('./utils.js');
const guidePages = require('../pages/guidePages.json');
const usables = require('../items/usables.json');
const equipment = require('../items/equipment.json');

//===================================================
//===================================================
//
//                   UI BUILDERS
//
//===================================================
//===================================================

/*
Functions returning UIs in the form of discord.js InteractionReplyOptions

Nearly all UIs displayed by the bot are defined here with the exception of some minor notification UIs or UIs without interactable elements.

The function names act as the name of the UI for all purposes relating to eventTokens.

All interactable components have a customId in the format: "nameOfUI-componentName/Type" + (optional)"-anyOtherInfo"
*/

//UI builder for main menu of discord bot
function mainMenu(tButtonDisabled) {
    let row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(["mainMenu", "showStats"].join('-'))
            .setLabel('Show Stats')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📜'),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "openInv"].join('-'))
            .setLabel('Open Inventory')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📦'),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "trade"].join('-'))
            .setLabel('Trade')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤝')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "findTreasure"].join('-'))
            .setLabel('Pick Up Edbucks')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💸')
            .setDisabled(tButtonDisabled ? true : false)
    );

    let row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(["mainMenu", "minigames"].join('-'))
            .setLabel('Minigames')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎮')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "challenge"].join('-'))
            .setLabel('Challenge')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🙌')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "wager"].join('-'))
            .setLabel('Wager Edbucks')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎲')
            .setDisabled(true)
    );

    let row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(["mainMenu", "shop"].join('-'))
            .setLabel('Shop')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🛒'),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "stockExchange"].join('-'))
            .setLabel('Edbuck Exchange')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🏢')
    );

    let row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(["mainMenu", "userLeaderboard"].join('-'))
            .setLabel('User Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏆'),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "msgLeaderboard"].join('-'))
            .setLabel('Message Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🥇'),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "settings"].join('-'))
            .setLabel('Settings')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚙️'),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "changelog"].join('-'))
            .setLabel('Changelog')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📰'),
        new ButtonBuilder()
            .setCustomId(["mainMenu", "help"].join('-'))
            .setLabel('Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❓')
    );

    return {
        content: bold('============\nMAIN MENU\n============'),
        components: [row1, row2, row3, row4]
    };
}

function mainHelp(section, pagenum) {
    let navRow;

    if (section == "main") {
        /*
        NOTE: The help menu buttons are special in that the 2nd event token is not a unique identifier of the button pressed but instead
        is "sectionButton" with the actual unique section being the 3rd eventToken denoting the name of the section as described in guidePages.json.
        */

        let row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Earning Edbucks")
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(["mainHelp", "sectionButton", "howToEarn"].join('-')),
                    new ButtonBuilder()
                        .setLabel("Stats")
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(["mainHelp", "sectionButton", "stats"].join('-')),
                    new ButtonBuilder()
                        .setLabel("Usables/Equips")
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(["mainHelp", "sectionButton", "usablesAndEquipment"].join('-')),
                    new ButtonBuilder()
                        .setLabel("Status Effects")
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(["mainHelp", "sectionButton", "statusEffects"].join('-')),
                    new ButtonBuilder()
                        .setLabel("Edbuck Exchange")
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(["mainHelp", "sectionButton", "edbuckExchange"].join('-'))
                )

            return {
                content:`
${bold('=====\nHELP\n=====')}
The Bank of Edbucks Bot facilitates a currency system for this discord server called Edbucks.

Every interaction is done through the main menu buttons and there are no commands needed to use the bot!

Make sure to add your birthday to the bot through the [Settings] button if you want to enable birthday gifts.

Click on any of the buttons below to learn about different aspects of the bot!
`,
                ephemeral: true,
                components: [row1]
            }
    } else {
        let navRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(["mainHelp", "back"].join('-')),
                new ButtonBuilder()
                    .setLabel("Prev")
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(["mainHelp", "prev", section, pagenum].join('-'))
                    .setDisabled(pagenum == 0),
                new ButtonBuilder()
                    .setLabel("Page " + (pagenum + 1))
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId("PAGENUMNAV")
                    .setDisabled(true),
                new ButtonBuilder()
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(["mainHelp", "next", section, pagenum].join('-'))
                    .setDisabled(pagenum >= (guidePages[section].length - 1))
            )

        let fullPage = underscore(guidePages[section][pagenum].header) + "\n" + guidePages[section][pagenum].content.join('\n');

        return {
            content: fullPage,
            ephemeral: true,
            components: [navRow]
        }
    }
}

async function msgLeaderboard(client, workingData, interaction, pagenum) {
    //populate leaderboardEntries with embed fields holding info on the leaderboard messages
    let leaderboardEntries = [];

    for (let i = pagenum * 5; i < (pagenum + 1) * 5; i++) {
        try {
            await client.channels.cache.get(workingData[interaction.guildId].msgLeaderboard[i].channelid).messages.fetch(workingData[interaction.guildId].msgLeaderboard[i].id).then(message => {
                leaderboardEntries.push(
                    {
                        name: `[${parseInt(i - (pagenum * 5)) + 1}] ` + underscore(workingData[interaction.guildId].msgLeaderboard[i].author + " (" + workingData[interaction.guildId].msgLeaderboard[i].score + " EB)"),
                        value: "[" + workingData[interaction.guildId].msgLeaderboard[i].snippet + "]" + "(" + message.url + ")"
                    }
                );
            });
        } catch(e) {
            leaderboardEntries.push(
                {
                    name: `[${parseInt(i - (pagenum * 5)) + 1}] ` + underscore(workingData[interaction.guildId].msgLeaderboard[i].author + " (" + workingData[interaction.guildId].msgLeaderboard[i].score + " EB)"),
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

    //create navigation row
    let navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(["msgLeaderboard", "prev", pagenum].join('-'))
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setCustomId("MSGLEADERBOARDPAGENUM")
                .setDisabled(true),
            new ButtonBuilder()
                .setLabel("Next")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(["msgLeaderboard", "next", pagenum].join('-'))
                .setDisabled(pagenum >= Math.ceil(workingData[interaction.guildId].msgLeaderboard.length / 5) - 1)
        )

    //send leaderboard message
    return {
        embeds: [leaderboardEmbed],
        ephemeral: true,
        components: [navRow]
    };
}

function changelog(pagenum) {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["changelog", "prev", pagenum].join('-'))
                .setDisabled(pagenum > 0 ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Prev"),
            new ButtonBuilder()
                .setCustomId("CHANGELOGPAGENUM")
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Page " + (pagenum + 1)),
            new ButtonBuilder()
                .setCustomId(["changelog", "next", pagenum].join('-'))
                .setDisabled(pagenum < (changelogPages.length - 1) ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Next")
        )

    let changes = "";
    let version = underscore("Version: " + changelogPages[pagenum].version) + "\n";

    changelogPages[pagenum].changes.forEach(obj => {
        changes += obj + "\n";
    });
    
    return {
        content: version + codeBlock(changes),
        components: [row],
        ephemeral: true
    }
}

function userLeaderboard(workingData, interaction, pagenum) {
    let sortedLeaderboard = workingData[interaction.guildId].users.sort((a, b) => (a.balance > b.balance) ? -1 : 1);
    let leaderboard = "";
    let userEntriesNum = sortedLeaderboard.length;

    sortedLeaderboard = sortedLeaderboard.slice(pagenum * config.userLeaderboardEntriesPerPage, (pagenum + 1) * config.userLeaderboardEntriesPerPage);

    sortedLeaderboard.forEach((user, index) => {
        leaderboard += "(" + (index + 1 + (pagenum * config.userLeaderboardEntriesPerPage)) + ") " + (user.id ? userMention(user.id) : user.tag) + ": " + user.balance + " EB \n"
    })

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["userLeaderboard", "prev", pagenum].join('-'))
                .setDisabled(pagenum > 0 ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Prev"),
            new ButtonBuilder()
                .setCustomId("USERLEADERBOARDPAGENUM")
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Page " + (pagenum + 1)),
            new ButtonBuilder()
                .setCustomId(["userLeaderboard", "next", pagenum].join('-'))
                .setDisabled(pagenum < (Math.ceil(userEntriesNum / config.userLeaderboardEntriesPerPage) - 1) ? false : true)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Next")
        );
    
    return {
        content: bold("====================\nUSER LEADERBOARD\n====================") + "\n" + leaderboard,
        components: [row],
        ephemeral: true
    }
}

function settings(workingData, interaction, pagenum, changedSettingName) {
    //get user settings
    let userSettings = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    }).settings;

    let msgContent = bold(`==========\nSETTINGS\n==========\n`);

    let row = new ActionRowBuilder();

    for (index = pagenum*4; index < (pagenum + 1) * 4; index++) {
        if (index < userSettings.length) {
            msgContent += `[${index - (pagenum*4) + 1}] ` + underscore(userSettings[index].description) + "\n";
            msgContent += inlineCode(`${typeof userSettings[index].value == "boolean" ? userSettings[index].value ? "Yes" : "No" : userSettings[index].value}`) + 
                `${userSettings[index].name == changedSettingName ? " Updated!":""}\n\n`;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(["settings", "editSettingValue", userSettings[index].name, pagenum].join('-'))
                    .setLabel(`Setting ${index - (pagenum*4) + 1}`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!userSettings[index].changeable)
            )
        } else {
            break;
        }
    }

    if (changedSettingName == "INVALIDENTRY") {
        msgContent += "Invalid Value Entry!"
    }

    let navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(["settings", "prev", pagenum].join('-'))
            .setLabel("Prev")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pagenum <= 0),
        new ButtonBuilder()
            .setCustomId("SETTINGSPAGENUM")
            .setLabel("Page " + (pagenum + 1))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(["settings", "next", pagenum].join('-'))
            .setLabel("Next")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pagenum >= Math.ceil(userSettings.length / 4) - 1),
    )

    return {
        content: msgContent,
        components: [row, navRow],
        ephemeral: true
    }
}

function shopCategories() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["shopCategories", "usables"].join('-'))
                .setLabel("Usables")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(["shopCategories", "equipment"].join('-'))
                .setLabel("Equipment")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(["shopCategories", "others"].join('-'))
                .setLabel("Others")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true) //NOTE: disabled until implemented
        )

    return {
        content: bold("==================\nSHOP CATEGORIES\n=================="),
        ephemeral: true,
        components: [row]
    };
}

function usablesShop(shopPages_usables, pagenum) {
    if (pagenum > shopPages_usables.length || pagenum < 0) pagenum = 0;

    let pageNavRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["usablesShop", "prev", pagenum].join('-'))
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setCustomId("USABLESSHOPPAGENUM")
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(["usablesShop", "next", pagenum].join('-'))
                .setLabel("Next")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!((shopPages_usables.length - 1) > pagenum))
        );
    
    let shopPage = [...shopPages_usables[pagenum]];
    shopPage.push(pageNavRow);

    return {
        content: bold("===============\nUSABLES SHOP\n==============="),
        components: shopPage,
        ephemeral: true
    }
}

function usablesShopItemInfo(workingData, interaction, eventTokens) {
    //get item name and info
    let itemName = eventTokens.shift();
    let itemInfo = usables.find(entry => {
        return entry.name == itemName;
    });

    //get user stats/effects
    let shopperStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["usablesShopItemInfo", "back"].join('-'))
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(["usablesShopItemInfo", "purchase", itemInfo.name, "1"].join('-'))
                .setLabel("Purchase")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(["usablesShopItemInfo", "purchase", itemInfo.name, "5"].join('-'))
                .setLabel("Purchase x5")
                .setStyle(ButtonStyle.Success),
        );

    let msgContent = bold("===============\nUSABLES SHOP\n===============") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock(`Description: ${itemInfo.description}\nEffect: ${itemInfo.effect}${itemInfo.critEffect ? `\nCrit Effect: ${itemInfo.critEffect}` : ""}\nPrice: ${itemInfo.price} EB`);
    msgContent += `\nDiscount: (${shopperStatsAndEffects.stats.usablesDiscount}%) ${itemInfo.price} -> ${shopperStatsAndEffects.stats.usablesDiscount ? Math.round(itemInfo.price * ((100 - shopperStatsAndEffects.stats.usablesDiscount) * .01)) :itemInfo.price}`;

    return {
        content: msgContent,
        components: [row],
        ephemeral: true
    }
}

function equipsShop(shopPages_equipment, shopPages_equipmentDirectory, pagenum) {
    if (pagenum > shopPages_equipment.length || pagenum < 0) pagenum = 0;

    let pageNavRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["equipsShop", "prev", pagenum].join('-'))
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setCustomId("EQUIPSSHOPPAGENUM")
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(["equipsShop", "next", pagenum].join('-'))
                .setLabel("Next")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!((shopPages_equipment.length - 1) > pagenum))
        );
    
    let shopPage = [...shopPages_equipment[pagenum]];
    shopPage.push(pageNavRow);

    let dirEntry = shopPages_equipmentDirectory[pagenum];

    return {
        content: bold("==================\nEQUIPMENT SHOP\n==================") + `\n${underscore(dirEntry[0].charAt(0).toUpperCase() + dirEntry[0].slice(1) + " Page " + (dirEntry[1] + 1))}`,
        components: shopPage,
        ephemeral: true
    }
}

function equipsShopItemInfo(eventTokens) {
    //get item's slot and name from event tokens
    let itemSlot = eventTokens.shift();
    let itemName = eventTokens.shift();

    //get item display name
    let itemInfo = equipment[itemSlot].find(entry => {
        return entry.name == itemName;
    });

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["equipsShopItemInfo", "back"].join('-'))
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(["equipsShopItemInfo", "purchase", itemInfo.slot, itemInfo.name].join('-'))
                .setLabel("Purchase")
                .setStyle(ButtonStyle.Success)
        );

    return {
        content: bold("==================\nEQUIPMENT SHOP\n==================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock(`Description: ${itemInfo.description}\nEffect: ${itemInfo.effect}\nSlot: ${itemInfo.slot.charAt(0).toUpperCase() + itemInfo.slot.slice(1)}\nPrice: ${itemInfo.price} EB`),
        components: [row],
        ephemeral: true
    };
}

function usablesInv(workingData, interaction, pagenum) {
    //get accessing user's data
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //build the UI for the given page number
    let page = [];
    for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
        let row = new ActionRowBuilder();
        for (let shelfIndex = 0; shelfIndex < config.usablesInventoryItemsPerRow; shelfIndex++) {
            //if an item exists in the user's inventory at the corresponding page and shelf index combination then add it to the UI
            if (accessingUser.itemInventory[(pagenum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex] != undefined) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(["usablesInv", "invSpace", accessingUser.itemInventory[(pagenum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex].name].join('-'))
                        .setLabel(accessingUser.itemInventory[(pagenum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex].displayName)
                        .setStyle(ButtonStyle.Success)
                )
            //else add an empty space to the UI
            } else {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel("Empty Space")
                        .setCustomId("EMPTYINVSPACE" + ((pagenum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex))
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
                .setCustomId(["usablesInv", "prev", pagenum].join('-'))
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pagenum <= 0),
            new ButtonBuilder()
                .setCustomId(["usablesInv", "equips"].join('-'))
                .setStyle(ButtonStyle.Danger)
                .setLabel("Equips"),
            new ButtonBuilder()
                .setLabel("Next")
                .setCustomId(["usablesInv", "next", pagenum].join('-'))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(accessingUser.itemInventory.length > ((pagenum + 1) * (4 * config.usablesInventoryItemsPerRow))))
        )

    page.push(navRow);

    return {
        content: bold("=================\nUsables Inventory\n=================") + underscore("\nPage " + (pagenum + 1)),
        components: page,
        ephemeral: true
    }
}

function usablesInvItemInfo(workingData, interaction, itemName) {
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
                .setCustomId(["usablesInvItemInfo", "back"].join('-'))
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(["usablesInvItemInfo", "use", itemInfo.name].join('-'))
                .setLabel("Use")
                .setStyle(ButtonStyle.Success)
        );

    return {
        content: bold("===================\nUSABLES INVENTORY\n===================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock(`Description: ${itemInfo.description}\nEffect: ${itemInfo.effect}${itemInfo.critEffect ? `\nCrit Effect: ${itemInfo.critEffect}` : ""}\nCount: ${itemInfo.count}`),
        components: [row],
        ephemeral: true
    };
}

function equipsInv(workingData, interaction, pagenum) {
    //get accessing user's data
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //create and populate invDirectory
    let invDirectory = [];

    for (let index = 0; index < (accessingUser.equipmentInventory.head.length > 0 ? Math.ceil(accessingUser.equipmentInventory.head.length / (config.equipsInvItemsPerRow * 4)) : 1); index++) {
        invDirectory.push(["head", index]);
    }

    for (let index = 0; index < (accessingUser.equipmentInventory.body.length > 0 ? Math.ceil(accessingUser.equipmentInventory.body.length / (config.equipsInvItemsPerRow * 4)) : 1); index++) {
        invDirectory.push(["body", index]);
    }

    for (let index = 0; index < (accessingUser.equipmentInventory.trinket.length > 0 ? Math.ceil(accessingUser.equipmentInventory.trinket.length / (config.equipsInvItemsPerRow * 4)) : 1); index++) {
        invDirectory.push(["trinket", index]);
    }

    for (let index = 0; index < (accessingUser.equipmentInventory.shoes.length > 0 ? Math.ceil(accessingUser.equipmentInventory.shoes.length / (config.equipsInvItemsPerRow * 4)) : 1); index++) {
        invDirectory.push(["shoes", index]);
    }

    let dirEntry = invDirectory[pagenum];

    let page = [];
    for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
        let row = new ActionRowBuilder();
        for (let slotIndex = 0; slotIndex < config.equipsInvItemsPerRow; slotIndex++) {
            if (accessingUser.equipmentInventory[dirEntry[0]][ ((4 * config.equipsInvItemsPerRow) * dirEntry[1]) + (rowIndex * config.equipsInvItemsPerRow) + slotIndex] != undefined) {
                let itemInfo = accessingUser.equipmentInventory[dirEntry[0]][ ((4 * config.equipsInvItemsPerRow) * dirEntry[1]) + (rowIndex * config.equipsInvItemsPerRow) + slotIndex];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(["equipsInv", "invSpace", itemInfo.slot, itemInfo.name].join("-"))
                        .setLabel(itemInfo.equipped ? `[E] ${itemInfo.displayName}` : itemInfo.displayName)
                        .setStyle(ButtonStyle.Success)
                )
            } else {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel("Empty Space")
                        .setCustomId("EMPTYSPACE-" + ((pagenum * (4 * config.equipsInvItemsPerRow)) + (rowIndex * config.equipsInvItemsPerRow) + slotIndex))
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
                .setCustomId(["equipsInv", "prev", pagenum].join('-'))
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pagenum <= 0),
            new ButtonBuilder()
                .setCustomId(["equipsInv", "usables"].join('-'))
                .setStyle(ButtonStyle.Danger)
                .setLabel("Usables"),
            new ButtonBuilder()
                .setLabel("Next")
                .setCustomId(["equipsInv", "next", pagenum].join('-'))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(invDirectory.length > (pagenum + 1)))
        )

    page.push(navRow);

    return {
        content: bold("================\nEquips Inventory\n================") + underscore(`\n${dirEntry[0].charAt(0).toUpperCase() + dirEntry[0].slice(1)} Page ` + (dirEntry[1] + 1)),
        components: page,
        ephemeral: true
    }
}

function equipsInvItemInfo(workingData, interaction, itemSlot, itemName) {
    //get user data
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //get item display name
    let itemInfo = accessingUser.equipmentInventory[itemSlot].find(entry => {
        return entry.name == itemName;
    });

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(["equipsInvItemInfo", "back"].join('-'))
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(["equipsInvItemInfo", "equip", itemInfo.slot, itemInfo.name].join('-'))
                .setLabel(itemInfo.equipped ? "Unequip" : "Equip")
                .setStyle(itemInfo.equipped ? ButtonStyle.Secondary :ButtonStyle.Success)
        );

    return {
        content: bold("================\nEquips Inventory\n================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock("Description: " + itemInfo.description + "\nEffect: " + itemInfo.effect + "\nSlot: " + `${itemInfo.slot.charAt(0).toUpperCase() + itemInfo.slot.slice(1)}`),
        components: [row],
        ephemeral: true
    };
}

function stockExchange(workingData, interaction, realtimeStockData, pagenum) {
    //NOTE: pagenum is kinda useless right now since current API limits restrict us to tracking 8 equities

    //get data of the user accessing the stock exchange UI
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    let investmentsByStockString = '';
    //calculate total value of all of the user's investments
    let totalInvestmentsValue = 0;
    let totalInvestmentsCurValue = 0;
    Object.keys(accessingUser.stockInvestments).forEach(key => {
        let investmentValueByStock = 0;
        accessingUser.stockInvestments[key].forEach(investment => {
            totalInvestmentsValue += investment.investmentAmount;
            investmentValueByStock += investment.investmentAmount;

            totalInvestmentsCurValue += investment.investmentAmount * (realtimeStockData[key].close/investment.investmentPrice)
        })
        if (totalInvestmentsValue > 0) {
            investmentsByStockString += `- $${key}: ${investmentValueByStock}\n`;
        }
    });

    totalInvestmentsCurValue = Math.round(totalInvestmentsCurValue * 1000) / 1000;

    let contentString = bold("========================\nTHE EDBUCK EXCHANGE\n========================");
    contentString += `
Last Updated: ${time(realtimeStockData.lastUpdated, "f")}
Total Investments Made: ${accessingUser.fStatValueOfTotalInvestmentsMade}
Total Profit Made: ${accessingUser.fStatTotalInvestmentProfits}
Total Investments Original Value: ${totalInvestmentsValue}
Total Investments Current Value: ${totalInvestmentsCurValue}
------------------------------
Current Investments By Stock:
${investmentsByStockString}------------------------------`;

    //create equity buttons rows
    //NOTE: this is hard coded in as 2 rows of 4 equities each since API limits dictate 8 max equities tracked
    let equityRows = [new ActionRowBuilder(), new ActionRowBuilder()];
    for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 4; i++) {
            if (config.trackedStocks[(4*r) + i] != undefined) {
                let equityInfo = realtimeStockData[config.trackedStocks[(4*r) + i].ticker];
                equityRows[r].addComponents(
                    new ButtonBuilder()
                        .setLabel("$" + config.trackedStocks[(4*r) + i].ticker)
                        .setStyle(equityInfo.close >= equityInfo.open ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setCustomId(["stockExchange", "selectStock", config.trackedStocks[(4*r) + i].ticker].join('-'))
                )
            } else {
                equityRows[r].addComponents(
                    new ButtonBuilder()
                        .setLabel("EMPTY")
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("EMPTYEQUITY_" + (4*r + i))
                        .setDisabled(true)
                )
            }
        }
    }
    
    //create navigation buttons row
    let navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(["stockExchange", "refresh"].join('-'))
                .setEmoji("🔄"),
            new ButtonBuilder()
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(["stockExchange", "prev"].join('-'))
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setCustomId("STOCKEXCHANGEPAGENUM")
                .setDisabled(true),
            new ButtonBuilder()
                .setLabel("Next")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(["stockExchange", "next"].join('-'))
                .setDisabled(true) /*NOTE: Set manually to disabled since we're limited to 8 equities atm*/
        );
    
    //append the navrow to the equityRows array and add equityRows as components parameter of the return
    equityRows.push(navRow);
    return {
        content: contentString,
        components: equityRows,
        ephemeral: true,
        files: []
    }
}

async function stockExchangeStockInfo(workingData, interaction, realtimeStockData, tenDayStockData, stockTicker) {
    //get accessing user's data, realtime stock data, and stock ticker
    let accessingUser = workingData[interaction.guildId].users.find(user => {
        return user.id == interaction.user.id;
    });
    let stockInfo = realtimeStockData[stockTicker];

    //calculate total original investments value and total current investments value
    let totalOriginalInvestmentsValue = 0;
    let totalCurrentInvestmentsValue = 0;

    if (accessingUser.stockInvestments[stockTicker] != undefined) {
        accessingUser.stockInvestments[stockTicker].forEach(investment => {
            totalOriginalInvestmentsValue += investment.investmentAmount;
    
            totalCurrentInvestmentsValue += investment.investmentAmount * (stockInfo.close/investment.investmentPrice);
        });
    }
    
    totalCurrentInvestmentsValue = Math.round(totalCurrentInvestmentsValue * 1000) / 1000;

    //check if graphBuffer is null (No need for time check since every time tenDayStockData values are updated, graph buffer is cleared)
    if (tenDayStockData[stockTicker].graphBuffer == null) {
        //Building line graph for historical data
        //Get X-axis labels and graph points
        let labels = tenDayStockData[stockTicker].values.reduce((accumulator, curVal) => {
            accumulator.push(curVal.datetime.substring(curVal.datetime.indexOf(' ')));
            return accumulator;
        }, []).reverse();
    
        let graphData = tenDayStockData[stockTicker].values.reduce((accumulator, curVal) => {
            accumulator.push(parseFloat(curVal.close));
            return accumulator;
        }, []).reverse();
    
        //instantiate data and options for graph
        let data = {
            labels: labels,
            datasets: [{
                label: '10 Day Stock Performance',
                fill: false,
                borderColor: graphData[0] <= graphData[graphData.length - 1] ? 'rgb(27, 186, 9)' : 'rgb(252, 10, 10)',
                tension: 0.1,
                data: graphData
            }],
            options: {
                scale: {
                    ticks:{
                        precision: 2
                    }
                }
            }
        }
    
        //create canvas for graph and instantiate graph configs
        let stockChartCanvas = new ChartJSNodeCanvas({width: 400, height: 400, backgroundColour: 'white'});
    
        let stockChartConfig = {
            type: 'line',
            data: data
        };
    
        //render graph buffer and assign to tenDayStockData
        tenDayStockData[stockTicker].graphBuffer = await stockChartCanvas.renderToBuffer(stockChartConfig);
    }

    //instantiate content of returned message object
    let contentString = bold("========================\nTHE EDBUCK EXCHANGE\n========================");
    contentString += `
Equity: ${config.trackedStocks.find(entry => { return entry.ticker == stockTicker }).name}
Ticker: $${stockTicker}
Current Price: $${stockInfo.close}
Open Price: $${stockInfo.open}
Day Percent Change: %${Math.round( ( ((stockInfo.close / stockInfo.open) - 1) + Number.EPSILON) * 10000) / 100}
Trade Volume: ${parseInt(stockInfo.volume).toLocaleString("en-US")}
Last Updated: ${time(realtimeStockData.lastUpdated, "f")}

Total Investments Original Value: ${totalOriginalInvestmentsValue}
Total Investments Current Value: ${totalCurrentInvestmentsValue}
`;

    //instantiate navigation button row
    let navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(["stockExchangeStockInfo", "back"].join('-')),
            new ButtonBuilder()
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(["stockExchangeStockInfo", "refresh", stockTicker].join('-'))
                .setEmoji("🔄"),
            new ButtonBuilder()
                .setLabel("Invest")
                .setStyle(ButtonStyle.Success)
                .setCustomId(["stockExchangeStockInfo", "invest", stockTicker, "initial"].join('-')),
            new ButtonBuilder()
                .setLabel("Sell")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId(["stockExchangeStockInfo", "sell", stockTicker].join('-')),
        );

    //return message object with content, navigation buttons, and graph png attachment
    return {
        content: contentString,
        components: [navRow],
        files: [{attachment: tenDayStockData[stockTicker].graphBuffer, name: stockTicker + 'StockChart.png'}],
        ephemeral: true
    }
}

function stockExchangeSellStocks(workingData, interaction, realtimeStockData, stockTicker, pagenum, notifMsg = "") {
    //get accessing user's data, accessing user's stats, stock ticker, and stock info
    let accessingUser = workingData[interaction.guildId].users.find(user => {
        return user.id == interaction.user.id;
    });
    let accessingUserStats = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);
    let stockInfo = realtimeStockData[stockTicker];

    //calculate total original investments value and total current investments value
    let totalOriginalInvestmentsValue = 0;
    let totalCurrentInvestmentsValue = 0;

    if (accessingUser.stockInvestments[stockTicker] != undefined) {
        accessingUser.stockInvestments[stockTicker].forEach(investment => {
            totalOriginalInvestmentsValue += investment.investmentAmount;
    
            totalCurrentInvestmentsValue += investment.investmentAmount * (stockInfo.close/investment.investmentPrice);
        });
    }
    
    totalCurrentInvestmentsValue = Math.round(totalCurrentInvestmentsValue * 1000) / 1000;

    //instantiate main text of UI
    let contentString = bold("========================\nTHE EDBUCK EXCHANGE\n========================");
    contentString += `
Equity: ${config.trackedStocks.find(entry => { return entry.ticker == stockTicker }).name}
Ticker: $${stockTicker}
Current Price: $${stockInfo.close}
Open Price: $${stockInfo.open}
Day Percent Change: %${Math.round((((stockInfo.close / stockInfo.open) - 1) + Number.EPSILON) * 10000) / 100}
Trade Volume: ${parseInt(stockInfo.volume).toLocaleString("en-US")}
Last Updated: ${time(realtimeStockData.lastUpdated, "f")}

Total Investments Original Value: ${totalOriginalInvestmentsValue}
Total Investments Current Value: ${totalCurrentInvestmentsValue}

Your Investment Profit Bonus: ${accessingUserStats.stats.stockProfitBonus}%
`;

    //construct investments section of UI and sell investments button
    let investmentsString = "";

    let sellButtonsActionRow = new ActionRowBuilder();

    if (accessingUser.stockInvestments[stockTicker] != undefined && accessingUser.stockInvestments[stockTicker].length > 0) {
        for (let i = (pagenum * config.investmentsDisplayedPerPage); i < ((pagenum + 1) * config.investmentsDisplayedPerPage); i++) {
            let investmentObj = accessingUser.stockInvestments[stockTicker][i];
            if (investmentObj != undefined) {
                let curInvestmentValue = investmentObj.investmentAmount * (stockInfo.close/investmentObj.investmentPrice);
                investmentsString += `
${bold(`[Investment ${i - ((pagenum * config.investmentsDisplayedPerPage) - 1)}]`)}
Original Investment: ${investmentObj.investmentAmount}
Date/Time Entered: ${time(investmentObj.investmentTimestamp, "F")}
Price Entered At: ${investmentObj.investmentPrice}
% Change:  ${Math.round( ( ((stockInfo.close / investmentObj.investmentPrice) - 1) + Number.EPSILON) * 10000) / 100}
Current Investment Value (With Bonus): ${Math.round(curInvestmentValue + (investmentObj.investmentAmount > curInvestmentValue ? 0 : (curInvestmentValue - investmentObj.investmentAmount) * (1 + (accessingUserStats.stats.stockProfitBonus/100))))}
`;
                sellButtonsActionRow.addComponents(
                    new ButtonBuilder()
                        .setLabel("Sell Investment " + (i - ((pagenum * config.investmentsDisplayedPerPage) - 1)))
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(["stockExchangeSellStocks", "sell", stockTicker, (i - ((pagenum * config.investmentsDisplayedPerPage)) + (pagenum * config.investmentsDisplayedPerPage))].join('-'))
                )
            }
        }
    }

    if (!investmentsString) {
        investmentsString = "\nYou have no investments in this equity!\n";
    };

    contentString += investmentsString;
    contentString += "\n" + notifMsg;

    //instantiate back button
    let backButtonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setCustomId(["stockExchangeSellStocks", "back", stockTicker].join('-'))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setLabel("Prev")
                .setCustomId(["stockExchangeSellStocks", "prev", pagenum, stockTicker].join('-'))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setLabel("Page " + (pagenum + 1))
                .setCustomId("STOCKEXCHANGESELLSTOCKSPAGENUM")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setLabel("Next")
                .setCustomId(["stockExchangeSellStocks", "next", pagenum, stockTicker].join('-'))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(sellButtonsActionRow.components.length == 0 || accessingUser.stockInvestments[stockTicker].length <= ((pagenum + 1) * config.investmentsDisplayedPerPage))
        )

    if (sellButtonsActionRow.components.length > 0) {
        return {
            content: contentString,
            components: [sellButtonsActionRow, backButtonRow],
            files: [],
            ephemeral: true
        }
    } else {
        return {
            content: contentString,
            components: [backButtonRow],
            files: [],
            ephemeral: true
        }
    }
}

//========================================================================================================================================

function notifCantSelfUse() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(["usablesInvItemInfo", "back"].join('-'))
        );
    
    return {
        content: "You can't use this item on yourself!",
        components: [row],
        ephemeral: true
    };
}

function notifTargetNotInVC() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(["usablesInvItemInfo", "back"].join('-'))
        );
    
    return {
        content: "Target is not in a voice call!",
        components: [row],
        ephemeral: true
    };
}

function notifDontHaveItem() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(["usablesInvItemInfo", "back"].join('-'))
        );
    
    return {
        content: "You don't have this item!",
        components: [row],
        ephemeral: true
    };
}

function notifCantUseOnBot() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(["usablesInvItemInfo", "back"].join('-'))
        );
    
    return {
        content: "You can't use this item on a bot!",
        components: [row],
        ephemeral: true
    };
}

module.exports = {
    mainMenu, mainHelp, msgLeaderboard, settings, usablesInv, equipsInv, shopCategories, equipsShop, usablesShop, changelog,
    userLeaderboard, stockExchange, stockExchangeSellStocks, usablesShopItemInfo, equipsShopItemInfo, usablesInvItemInfo,
    equipsInvItemInfo,
    stockExchangeStockInfo, notifCantSelfUse, notifDontHaveItem, notifTargetNotInVC, notifCantUseOnBot
}