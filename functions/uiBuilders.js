const { ButtonStyle, ActionRowBuilder, ButtonBuilder, bold, underscore, codeBlock} = require('discord.js');
const changelog = require('../changelog.json');
const intEventTokens = require('../constants/intEventTokens.js');
const config = require('../constants/configConsts.js');

//===================================================
//===================================================
//
//                   UI BUILDERS
//
//===================================================
//===================================================

//UI builder for main menu of discord bot
function menuUI(tButtonDisabled) {
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
function usablesShopUI(shopPages_usables, pagenum) {
    if (pagenum > shopPages_usables.length || pagenum < 0) pagenum = 0;

    let pageNavRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "prev-" + pagenum)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "pagenum")
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "next-" + pagenum)
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

function usablesInvUI(workingData, interaction, pageNum) {
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

function changelogUI(pageNum) {
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

function userLeaderboardUI(workingData, interaction, pageNum) {
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

function notifCantSelfUse() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
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
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
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
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
        );
    
    return {
        content: "You don't have this item!",
        components: [row],
        ephemeral: true
    };
}

module.exports = {
    menuUI, usablesInvUI, usablesShopUI, changelogUI, userLeaderboardUI, notifCantSelfUse, notifDontHaveItem, notifTargetNotInVC
}