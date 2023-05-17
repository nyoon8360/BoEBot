const { ButtonStyle, time, ActionRowBuilder, ButtonBuilder, inlineCode, bold, underscore, EmbedBuilder, codeBlock, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const usables = require('../items/usables.json');
const equipment = require('../items/equipment.json');
const intEventTokens = require('../constants/intEventTokens.js');
const config = require('../constants/configConsts.js');
const uiBuilders = require('./uiBuilders.js');
const utils = require('./utils.js');
const statInfo = require('../constants/statInfo.json');

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

    let userStatsString = "";

    let userStatsObj = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id, true);

    Object.keys(userStatsObj.stats).forEach(key => {
        userStatsString += `-${statInfo[key].displayName}: ${userStatsObj.stats[key]}\n`;
    });

    interaction.reply({
        content: `
${bold('============\nYOUR STATS\n============')}
Edbuck Balance: ${requester.balance.toLocaleString("en-US")}
Last Edbuck Awarded: ${lastAwarded}
Edbuck Reactions Awarded: ${requester.fStatReactionsAwarded}
Edbuck Reactions Received: ${requester.fStatReactionsReceived}
Stats:
${userStatsString}Status Effects:
${afflictedBy}
        `,
        ephemeral: true
    });
}

function mainMenu_openInv(workingData, interaction) {
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
    interaction.reply(uiBuilders.usablesInvUI(workingData, interaction, 0));
}

function mainMenu_findTreasure(workingData, interaction) {
    //on click, award treasure, deactivate this button for a random amount of hours, and then reactivate
    let user = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    let userStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

    let treasure = Math.round(Math.random() * (config.treasureUR - config.treasureLR)) + config.treasureLR;
    let oTreasure = treasure;
    let doubledMsg = "";
    console.log(userStatsAndEffects.stats.treasureLuck);
    if (userStatsAndEffects.stats.treasureLuck) {
        treasure *= 2;
        doubledMsg = `\nThis amount was doubled for a total of ${treasure} edbucks!`;
    }

    user.balance += treasure;

    interaction.reply({
        content: `
You've found ${oTreasure} edbucks dropped by a wild Edwin!${doubledMsg}
All the local Edwins have been spooked back into hiding.
Check back again later to see if they've come back!
        `,
        ephemeral: true
    });

    interaction.channel.messages.fetch(workingData[interaction.guildId].activeMenuId).then(result => {
        //disable pick up edbucks button
        result.edit(uiBuilders.menuUI(true));
        
        let curDate = new Date(Date.now());
        console.log(`(${curDate.toLocaleString()}) Edbucks Button Looted By: ${interaction.user.tag}`);
        //set async function to wait until cooldown is over then re-enable button
        (async (menu) => {
            let timeoutDuration = Math.floor(Math.random() * (config.treasureCDUR - config.treasureCDLR)) + config.treasureCDLR;
            await setTimeout(() => menu.edit(uiBuilders.menuUI()), timeoutDuration * 1000);
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
                .setStyle(ButtonStyle.Danger),
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
    interaction.reply(uiBuilders.helpUI("MAIN"));
}

function help_openPage(interaction, section, pagenum) {
    interaction.update(uiBuilders.helpUI(section, pagenum));
}

function mainMenu_settings(workingData, interaction) {
    interaction.reply(uiBuilders.settingsUI(workingData, interaction, 0));
}

function mainMenu_userLeaderboard(workingData, interaction) {
    interaction.reply(uiBuilders.userLeaderboardUI(workingData, interaction, 0));
}

async function mainMenu_msgLeaderboard(client, workingData, interaction, pagenum) {
    let leaderboardUI = await uiBuilders.msgLeaderboardUI(client, workingData, interaction, pagenum);

    //send leaderboard message
    interaction.reply(leaderboardUI);
}

function mainMenu_changelog(interaction) {
    interaction.reply(uiBuilders.changelogUI(0));
}

function mainMenu_stockExchange(workingData, interaction, realtimeStockData) {
    interaction.reply(uiBuilders.stockExchangeUI(workingData, interaction, realtimeStockData, 0));
}

function settings_editSettingValue(workingData, interaction, eventTokens, birthdayDirectory) {
    if (eventTokens.length == 2) {
        //if no edit value is passed meaning we need to open the UI for the user to edit the value
        //get user's setting object
        let pageNum = eventTokens.shift();
        let settingName = eventTokens.shift();

        let settingObj = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        }).settings.find(obj => {
            return obj.name == settingName;
        });

        switch (settingObj.valueType) {
            case "boolean":
                //no need to call UI builder. Simply swap the value.
                settingObj.value = !settingObj.value;
                interaction.update(uiBuilders.settingsUI(workingData, interaction, pageNum, settingName));
                break;
            
            case "mm/dd":
                let modal = new ModalBuilder()
                    .setCustomId(intEventTokens.settingsEditValuePrefix + `${pageNum}-${settingName}-"valueEntered"`)
                    .setTitle("Edit Setting")
                    .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("newSettingValue")
                            .setStyle(TextInputStyle.Short)
                            .setLabel("Enter Date in MM/DD format (Month/Day).")
                        )
                    )

                interaction.showModal(modal);
                break;
        }
    } else {
        //if an edit value is passed meaning we need to edit the user's setting value then pass a successful edit UI
        //get setting obj
        let pageNum = eventTokens.shift();
        let settingName = eventTokens.shift();

        let settingObj = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        }).settings.find(obj => {
            return obj.name == settingName;
        });
        
        //validate the new value
        switch(settingObj.valueType) {
            case "mm/dd":
                let newSettingValue = interaction.fields.getTextInputValue('newSettingValue');
                let regex = new RegExp("^(0?[1-9]|1[0-2])/(0?[1-9]|[12][0-9]|3[01])$");
                if(regex.test(newSettingValue)) {
                    //valid entry
                    settingObj.value = newSettingValue;
                    settingObj.changeable = false;
                    interaction.update(uiBuilders.settingsUI(workingData, interaction, pageNum, settingName));
                    birthdayDirectory[interaction.guildId] = utils.getUpdatedBirthdayDirectory(workingData, interaction.guildId);
                } else {
                    //invalid entry
                    interaction.update(uiBuilders.settingsUI(workingData, interaction, pageNum, "INVALIDENTRY"));
                }
                break;
        }
    }
}

function usablesShop_selectShelf(workingData, interaction, eventTokens) {
    let itemName = eventTokens.shift();
    //get item display name
    let itemInfo = usables.find(entry => {
        return entry.name == itemName;
    });

    //get user stats/effects
    let shopperStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

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

    let msgContent = bold("===============\nUSABLES SHOP\n===============") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock(`Description: ${itemInfo.description}\nEffect: ${itemInfo.effect}${itemInfo.critEffect ? `\nCrit Effect: ${itemInfo.critEffect}` : ""}\nPrice: ${itemInfo.price} EB`);
    msgContent += `\nDiscount: (${shopperStatsAndEffects.stats.usablesDiscount}%) ${itemInfo.price} -> ${shopperStatsAndEffects.stats.usablesDiscount ? Math.round(itemInfo.price * ((100 - shopperStatsAndEffects.stats.usablesDiscount) * .01)) :itemInfo.price}`;

    interaction.update({
        content: msgContent,
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

    let customerStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);
    let finalPrice = itemInfo.price;

    if (customerStatsAndEffects.stats.usablesDiscount) {
        finalPrice = Math.round(itemInfo.price * ((100 - customerStatsAndEffects.stats.usablesDiscount) * .01));
    }

    //get purchase count from event tokens
    let pCount = parseInt(eventTokens.shift());

    //do a balance check for the customer
    if (customer.balance < (finalPrice * pCount)) {
        interaction.reply({
            content: "Insufficient Edbucks!",
            ephemeral: true
        });
        return;
    }

    //deduct balance and give customer the purchased item(s)
    customer.balance -= (finalPrice * pCount);

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
        content: bold("===================\nPurchase Complete!\n===================\nObtained " + pCount + "x " + itemInfo.displayName + ".\nLost " + (pCount*finalPrice) + " EB."),
        ephemeral: true,
        components: [row]
    });
}

function equipsShop_selectShelf(interaction, eventTokens) {
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
                .setCustomId(intEventTokens.equipShopPurchaseMenuPrefix + "BACK-")
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intEventTokens.equipShopPurchaseMenuPrefix + "BUY-" + itemInfo.slot + "-" + itemInfo.name)
                .setLabel("Purchase")
                .setStyle(ButtonStyle.Success)
        );

    interaction.update({
        content: bold("==================\nEQUIPMENT SHOP\n==================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock(`Description: ${itemInfo.description}\nEffect: ${itemInfo.effect}\nSlot: ${itemInfo.slot.charAt(0).toUpperCase() + itemInfo.slot.slice(1)}\nPrice: ${itemInfo.price} EB`),
        components: [row],
        ephemeral: true
    });
}

function equipsShop_purchase(workingData, interaction, eventTokens) {
    //get item name and slot from eventTokens
    let itemSlot = eventTokens.shift();
    let itemName = eventTokens.shift();

    //fetch item and customer info
    let itemInfo = equipment[itemSlot].find(obj => {
        return obj.name == itemName;
    });

    let customer = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //do a balance check for the customer
    if (customer.balance < itemInfo.price) {
        interaction.reply({
            content: "Insufficient Edbucks!",
            ephemeral: true
        });
        return;
    }

    //do a possession check to make sure user doesnt already have the item.
    let existingItem = customer.equipmentInventory[itemSlot].find(obj => {
        return obj.name == itemName;
    });

    if (existingItem) {
        interaction.reply({
            content: "You already have this equipment!",
            ephemeral: true
        });
        return;
    }

    //deduct balance and give customer the purchased item(s)
    customer.balance -= itemInfo.price;

    let newItemEntry = {...itemInfo};
    newItemEntry.equipped = false;
    customer.equipmentInventory[itemSlot].push(newItemEntry);

    //create and update UI to purchased complete screen
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.equipShopPurchaseMenuPrefix + "BACK-")
                .setStyle(ButtonStyle.Danger)
                .setLabel("Back")
        )

    interaction.update({
        content: bold("===================\nPurchase Complete!\n===================\nObtained " + itemInfo.displayName + ".\nLost " + itemInfo.price + " EB."),
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
        content: bold("===================\nUSABLES INVENTORY\n===================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock(`Description: ${itemInfo.description}\nEffect: ${itemInfo.effect}${itemInfo.critEffect ? `\nCrit Effect: ${itemInfo.critEffect}` : ""}\nCount: ${itemInfo.count}`),
        components: [row],
        ephemeral: true
    });
}

function equipsInventory_selectSlot(workingData, interaction, eventTokens) {
    let itemSlot = eventTokens.shift();
    let itemName = eventTokens.shift();
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
                .setCustomId(intEventTokens.playerEquipsInvInfoPrefix + "BACK-")
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerEquipsInvInfoPrefix + "EQUIP-" + `${itemInfo.slot}-${itemInfo.name}`)
                .setLabel(itemInfo.equipped ? "Unequip" : "Equip")
                .setStyle(itemInfo.equipped ? ButtonStyle.Secondary :ButtonStyle.Success)
        );

    interaction.update({
        content: bold("================\nEquips Inventory\n================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock("Description: " + itemInfo.description + "\nEffect: " + itemInfo.effect + "\nSlot: " + `${itemInfo.slot.charAt(0).toUpperCase() + itemInfo.slot.slice(1)}`),
        components: [row],
        ephemeral: true
    });
}

function equipsInventory_toggleEquip(workingData, interaction, eventTokens) {
    let itemSlot = eventTokens.shift();
    let itemName = eventTokens.shift();
    //get user data
    let accessingUser = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    //get item information
    let itemInfo = accessingUser.equipmentInventory[itemSlot].find(entry => {
        return entry.name == itemName;
    });

    //check if the toggled equip slot already has an item in it
    let existingEquippedItem = accessingUser.equipmentInventory[itemSlot].find(obj => {
        return obj.equipped == true;
    });

    if (itemInfo.equipped) {
        itemInfo.equipped = false;
    } else if (existingEquippedItem) {
        existingEquippedItem.equipped = false;
        itemInfo.equipped = true;
    } else {
        itemInfo.equipped = true;
    }

    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerEquipsInvInfoPrefix + "BACK-")
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(intEventTokens.playerEquipsInvInfoPrefix + "EQUIP-" + `${itemInfo.slot}-${itemInfo.name}`)
                .setLabel(itemInfo.equipped ? "Unequip" : "Equip")
                .setStyle(itemInfo.equipped ? ButtonStyle.Secondary :ButtonStyle.Success)
        );

    interaction.update({
        content: bold("================\nEquips Inventory\n================") + "\n\n" + bold(underscore(itemInfo.displayName)) + "\n" + codeBlock("Description: " + itemInfo.description + "\nEffect: " + itemInfo.effect + "\nSlot: " + `${itemInfo.slot.charAt(0).toUpperCase() + itemInfo.slot.slice(1)}`),
        components: [row],
        ephemeral: true
    });
}

function stockExchange_selectStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens) {
    uiBuilders.stockExchangeStockInfoUI(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens).then(ui => {
        interaction.update(ui);
    })
}

function stockExchange_refreshStockInfo(workingData, interaction, realtimeStockData) {
    interaction.update(uiBuilders.stockExchangeUI(workingData, interaction, realtimeStockData, 0));
}

function stockExchange_openInvestments(workingData, interaction, realtimeStockData, eventTokens, pagenum) {
    interaction.update(uiBuilders.stockExchangeSellStocksUI(workingData, interaction, realtimeStockData, eventTokens, pagenum));
}

function stockExchange_investInStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens) {
    let stockTicker = eventTokens.shift();
    let nextToken = eventTokens.shift();

    if (!nextToken) {
        let modal = new ModalBuilder()
            .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "INVEST-" + stockTicker + "-SUBMIT")
            .setTitle("Investment Form For: " + stockTicker)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("investmentAmount")
                        .setStyle(TextInputStyle.Short)
                        .setLabel("Investment Amount (10-999)")
                        .setRequired(true)
                        .setMinLength(2)
                        .setMaxLength(10)
                        
                        
            )
        )

        interaction.showModal(modal);
    } else {
        let enteredInvestment = interaction.fields.getTextInputValue('investmentAmount');
        let parsedInvestment = parseInt(enteredInvestment);

        let userData = workingData[interaction.guildId].users.find(user => {
            return user.id == interaction.user.id;
        });

        //check if enteredInvestment is not a number, just whitespace, not an integer, above 999, or below 10
        if (isNaN(enteredInvestment) || isNaN(parsedInvestment) || parsedInvestment != parseFloat(enteredInvestment) || parsedInvestment > 999 || parsedInvestment < 10) {
            let backButtonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "NOTIFBACK-" + stockTicker)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Back")
                )

            interaction.update({
                content: "Invalid Amount Entered!",
                components: [backButtonRow],
                files: [],
                ephemeral: true
            });
            return;
        //check if investment amount entered is above user's balance
        } else if (parsedInvestment > userData.balance) {
            let backButtonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "NOTIFBACK-" + stockTicker)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Back")
                )

            interaction.update({
                content: "Insufficient Balance!",
                components: [backButtonRow],
                files: [],
                ephemeral: true
            });
            return;
        }

        //instantiate stock ticker entry in user's stock investments if it doesnt exist
        if (!(stockTicker in userData.stockInvestments)) {
            userData.stockInvestments[stockTicker] = [];
        }

        //push investment object into user's data
        userData.stockInvestments[stockTicker].push(
            {
                investmentTimestamp: Math.floor(Date.now()/1000),
                investmentAmount: parsedInvestment,
                investmentPrice: realtimeStockData[stockTicker].close
            }
        )

        //update funstats
        userData.fStatValueOfTotalInvestmentsMade += parsedInvestment;

        //subtract investment amount from user's balance
        userData.balance -= parsedInvestment;
        
        let backButtonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(intEventTokens.stockExchangeInfoPagePrefix + "NOTIFBACK-" + stockTicker)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Back")
                )

        interaction.update({
            content: "Investment Successful!",
            components: [backButtonRow],
            files: [],
            ephemeral: true
        });
    }
}

function stockExchange_executeStockSell(workingData, interaction, realtimeStockData, eventTokens) {
    //get stock ticker and investment index from event tokens
    let stockTicker = eventTokens.shift();
    let investmentIndex = parseInt(eventTokens.shift());

    //get accessing user's data and stats
    let accessingUser = workingData[interaction.guildId].users.find(user => {
        return user.id == interaction.user.id;
    });
    let accessingUserStats = utils.checkStatsAndEffects(workingData, interaction, accessingUser.id);

    //get stock info and investment info
    let stockInfo = realtimeStockData[stockTicker];
    let investmentObj = accessingUser.stockInvestments[stockTicker][investmentIndex];

    //calculate final investment value
    let curInvestmentValue = investmentObj.investmentAmount * (stockInfo.close/investmentObj.investmentPrice);
    let finalInvestmentValue = Math.round(curInvestmentValue + (investmentObj.investmentAmount > curInvestmentValue ? 0 : (curInvestmentValue - investmentObj.investmentAmount) * (1 + (accessingUserStats.stats.stockProfitBonus/100))))

    //update funstats
    accessingUser.fStatTotalInvestmentProfits += finalInvestmentValue - investmentObj.investmentAmount;

    //remove investment from user's data
    accessingUser.stockInvestments[stockTicker].splice(investmentIndex, 1);

    //add final investment value to user's balance
    accessingUser.balance += finalInvestmentValue;

    interaction.update(uiBuilders.stockExchangeSellStocksUI(workingData, interaction, realtimeStockData, [stockTicker], 0, `You've sold $${stockTicker} stock and gained ${finalInvestmentValue} EB!`))
}

module.exports = {
    mainMenu_changelog, mainMenu_findTreasure, mainMenu_help, mainMenu_msgLeaderboard, mainMenu_openInv, mainMenu_shop, mainMenu_showStats, mainMenu_userLeaderboard, mainMenu_settings, mainMenu_stockExchange,
    settings_editSettingValue,
    help_openPage,
    usablesInventory_selectSlot, usablesShop_purchase, usablesShop_selectShelf,
    equipsShop_selectShelf, equipsShop_purchase, equipsInventory_selectSlot, equipsInventory_toggleEquip,
    stockExchange_selectStock, stockExchange_refreshStockInfo, stockExchange_investInStock, stockExchange_openInvestments, stockExchange_executeStockSell
}