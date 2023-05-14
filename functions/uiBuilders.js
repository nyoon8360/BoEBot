const { ButtonStyle, ActionRowBuilder, ButtonBuilder, bold, time, underscore, codeBlock, inlineCode, userMention} = require('discord.js');
const changelog = require('../changelog.json');
const intEventTokens = require('../constants/intEventTokens.js');
const config = require('../constants/configConsts.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

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
            .setEmoji('🛒'),
        new ButtonBuilder()
            .setCustomId(intEventTokens.mainMenuPrefix + 'stockexchange-')
            .setLabel('Stock Exchange')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🏢')
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
            .setEmoji('⚙️'),
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

function settingsUI(workingData, interaction, pagenum, changedSettingName) {
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
                    .setCustomId(`${intEventTokens.settingsEditValuePrefix}${pagenum}-${userSettings[index].name}`)
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
            .setCustomId(intEventTokens.settingsNavPrefix + "PREV-" + pagenum)
            .setLabel("Prev")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pagenum <= 0),
        new ButtonBuilder()
            .setCustomId(intEventTokens.settingsNavPrefix + "PAGENUM")
            .setLabel("Page " + (pagenum + 1))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(intEventTokens.settingsNavPrefix + "NEXT-" + pagenum)
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

//UI builder for usables shop
function usablesShopUI(shopPages_usables, pagenum) {
    if (pagenum > shopPages_usables.length || pagenum < 0) pagenum = 0;

    let pageNavRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "PREV-" + pagenum)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "pagenum")
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(intEventTokens.usablesShopNavPagesPrefix + "NEXT-" + pagenum)
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

function equipsShopUI(shopPages_equipment, shopPages_equipmentDirectory, pagenum) {
    if (pagenum > shopPages_equipment.length || pagenum < 0) pagenum = 0;

    let pageNavRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.equipShopNavPagesPrefix + "PREV-" + pagenum)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setCustomId(intEventTokens.equipShopNavPagesPrefix + "pagenum")
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(intEventTokens.equipShopNavPagesPrefix + "NEXT-" + pagenum)
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

//UI builder for usables inventory
function usablesInvUI(workingData, interaction, pageNum) {
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
            if (accessingUser.itemInventory[(pageNum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex] != undefined) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(intEventTokens.playerUsablesInvSelectSlotPrefix + accessingUser.itemInventory[(pageNum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex].name)
                        .setLabel(accessingUser.itemInventory[(pageNum * (4 * config.usablesInventoryItemsPerRow)) + (rowIndex * config.usablesInventoryItemsPerRow) + shelfIndex].displayName)
                        .setStyle(ButtonStyle.Success)
                )
            //else add an empty space to the UI
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
                .setCustomId(intEventTokens.playerUsablesInvNavPrefix + "PREV-" + pageNum)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum <= 0),
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerUsablesInvNavPrefix + "EQUIPS")
                .setStyle(ButtonStyle.Danger)
                .setLabel("Equips"),
            new ButtonBuilder()
                .setLabel("Next")
                .setCustomId(intEventTokens.playerUsablesInvNavPrefix + "NEXT-" + pageNum)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(accessingUser.itemInventory.length > ((pageNum + 1) * (4 * config.usablesInventoryItemsPerRow))))
        )

    page.push(navRow);

    return {
        content: bold("=================\nUsables Inventory\n=================") + underscore("\nPage " + (pageNum + 1)),
        components: page,
        ephemeral: true
    }
}

function equipsInvUI(workingData, interaction, pageNum) {
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

    let dirEntry = invDirectory[pageNum];

    let page = [];
    for (let rowIndex = 0; rowIndex < 4; rowIndex ++) {
        let row = new ActionRowBuilder();
        for (let slotIndex = 0; slotIndex < config.equipsInvItemsPerRow; slotIndex++) {
            if (accessingUser.equipmentInventory[dirEntry[0]][ ((4 * config.equipsInvItemsPerRow) * dirEntry[1]) + (rowIndex * config.equipsInvItemsPerRow) + slotIndex] != undefined) {
                let itemInfo = accessingUser.equipmentInventory[dirEntry[0]][ ((4 * config.equipsInvItemsPerRow) * dirEntry[1]) + (rowIndex * config.equipsInvItemsPerRow) + slotIndex];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(intEventTokens.playerEquipsInvSelectSlotPrefix + itemInfo.slot + "-" + itemInfo.name)
                        .setLabel(itemInfo.equipped ? `[E] ${itemInfo.displayName}` : itemInfo.displayName)
                        .setStyle(ButtonStyle.Success)
                )
            } else {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel("Empty Space")
                        .setCustomId(intEventTokens.playerEquipsInvSelectSlotPrefix + "EMPTYSPACE-" + ((pageNum * (4 * config.equipsInvItemsPerRow)) + (rowIndex * config.equipsInvItemsPerRow) + slotIndex))
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
                .setCustomId(intEventTokens.playerEquipsInvNavPrefix + "PREV-" + pageNum)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum <= 0),
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerEquipsInvNavPrefix + "USABLES")
                .setStyle(ButtonStyle.Danger)
                .setLabel("Usables"),
            new ButtonBuilder()
                .setLabel("Next")
                .setCustomId(intEventTokens.playerEquipsInvNavPrefix + "NEXT-" + pageNum)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!(invDirectory.length > (pageNum + 1)))
        )

    page.push(navRow);

    return {
        content: bold("================\nEquips Inventory\n================") + underscore(`\n${dirEntry[0].charAt(0).toUpperCase() + dirEntry[0].slice(1)} Page ` + (dirEntry[1] + 1)),
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
        leaderboard += "(" + (index + 1 + (pageNum * config.userLeaderboardEntriesPerPage)) + ") " + (user.id ? userMention(user.id) : user.tag) + ": " + user.balance + " EB \n"
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

function stockExchangeUI(workingData, interaction, realtimeStockData, pagenum) {
    //NOTE: pagenum is kinda useless right now since current API limits restrict us to tracking 8 equities

    //get data of the user accessing the stock exchange UI
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //calculate total value of all of the user's investments
    let totalInvestmentsValue = 0;
    Object.keys(accessingUser.stockInvestments).forEach(key => {
        accessingUser.stockInvestments[key].forEach(investment => {
            totalInvestmentsValue += investment.investmentAmount;
        })
    });

    let contentString = bold("========================\nTHE EDBUCK EXCHANGE\n========================");
    contentString += `
Last Updated: ${time(realtimeStockData.lastUpdated, "f")}
Total Investments Made: ${accessingUser.fStatValueOfTotalInvestmentsMade}
Total Profit Made: ${accessingUser.fStatTotalInvestmentProfits}
Current Total Investments: ${totalInvestmentsValue}
------------------------------`;

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
                        .setCustomId(intEventTokens.stockExchangeSelectStockPrefix + config.trackedStocks[(4*r) + i].ticker)
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
                .setCustomId(intEventTokens.stockExchangeNavPrefix + "REFRESH")
                .setEmoji("🔄"),
            new ButtonBuilder()
                .setLabel("Prev")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(intEventTokens.stockExchangeNavPrefix + "PREV")
                .setDisabled(!(pagenum > 0)),
            new ButtonBuilder()
                .setLabel("Page " + (pagenum + 1))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(intEventTokens.stockExchangeNavPrefix + "PAGENUM")
                .setDisabled(true),
            new ButtonBuilder()
                .setLabel("Next")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(intEventTokens.stockExchangeNavPrefix + "NEXT")
                .setDisabled(true) /*NOTE: Set manually to disabled since we're limited to 8 equities atm*/
        );
    
    //append the navrow to the equityRows array and add equityRows as components parameter of the return
    equityRows.push(navRow);
    return {
        content: contentString,
        components: equityRows,
        ephemeral: true
    }
}

async function stockExchangeStockInfoUI(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens) {
    //get accessing user's data, realtime stock data, and stock ticker
    let accessingUser = workingData[interaction.guildId].users.find(user => {
        return user.id == interaction.user.id;
    });
    let stockTicker = eventTokens.shift();
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
Exchange: ${stockInfo.exchange == null ? "Unknown" : stockInfo.exchange}
Market Status: ${stockInfo.is_market_open == null ? "Unknown" : stockInfo.is_market_open ? "OPEN" : "CLOSE"}
Last Updated: ${time(realtimeStockData.lastUpdated, "f")}

Investments Total Original Value: ${totalOriginalInvestmentsValue}
Investments Total Current Value: ${totalCurrentInvestmentsValue}
`;

    //instantiate navigation button row
    let navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "BACK"),
            new ButtonBuilder()
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "REFRESH-" + stockTicker)
                .setEmoji("🔄"),
            new ButtonBuilder()
                .setLabel("Invest")
                .setStyle(ButtonStyle.Success)
                .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "INVEST-" + stockTicker),
            new ButtonBuilder()
                .setLabel("Sell")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "SELL-" + stockTicker),
        );

    //return message object with content, navigation buttons, and graph png attachment
    return {
        content: contentString,
        components: [navRow],
        files: [{attachment: tenDayStockData[stockTicker].graphBuffer, name: stockTicker + 'StockChart.png'}],
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

function notifCantUseOnBot() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
        );
    
    return {
        content: "You can't use this item on a bot!",
        components: [row],
        ephemeral: true
    };
}

module.exports = {
    menuUI, settingsUI, usablesInvUI, equipsInvUI, equipsShopUI, usablesShopUI, changelogUI, userLeaderboardUI, stockExchangeUI,
    stockExchangeStockInfoUI, notifCantSelfUse, notifDontHaveItem, notifTargetNotInVC, notifCantUseOnBot
}