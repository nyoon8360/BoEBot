const { ButtonStyle, time, ActionRowBuilder, ButtonBuilder, inlineCode, bold, underscore, EmbedBuilder, codeBlock, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const usables = require('../items/usables.json');
const equipment = require('../items/equipment.json');
const config = require('../constants/configConsts.js');
const uiBuilders = require('./uiBuilders.js');
const utils = require('./utils.js');
const statInfo = require('../constants/statInfo.json');
const { usableItemsFunctionalities } = require('./itemFunctions.js');

//===================================================
//===================================================
//
//             Interaction Event Handlers
//
//===================================================
//===================================================

/*
Event handler function declarations that are fired when interactions are made with different UIs in the bot.

Most handlers will update UIs after parsing the necessary information from eventTokens.

All function signatures are in the format of: nameOfUIInteractedWith_name/typeOfComponentInteractedWith
*/

//REPLY with user's stats UI
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

//REPLY with user's inventory UI
function mainMenu_openInv(workingData, interaction) {
    interaction.reply(uiBuilders.usablesInv(workingData, interaction, 0));
}

//award user with found currency and REPLY with notification indicating how much currency they found
function mainMenu_findTreasure(workingData, interaction) {
    //on click, award treasure, deactivate this button for a random amount of hours, and then reactivate
    let user = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    let userStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

    let treasure = Math.round(Math.random() * (config.treasureUR - config.treasureLR)) + config.treasureLR;
    let oTreasure = treasure;
    let doubledMsg = "";
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
        result.edit(uiBuilders.mainMenu(true));
        
        let curDate = new Date(Date.now());
        console.log(`(${curDate.toLocaleString()}) Edbucks Button Looted By: ${interaction.user.tag}`);
        //set async function to wait until cooldown is over then re-enable button
        (async (menu) => {
            let timeoutDuration = Math.floor(Math.random() * (config.treasureCDUR - config.treasureCDLR)) + config.treasureCDLR;
            await setTimeout(() => menu.edit(uiBuilders.mainMenu()), timeoutDuration * 1000);
        })(result);
    });
}

//REPLY with shop categories menu
function mainMenu_shop(interaction) {
    interaction.reply(uiBuilders.shopCategories());
}

//REPLY with help menu
function mainMenu_help(interaction) {
    interaction.reply(uiBuilders.mainHelp("main"));
}

//REPLY with settings menu
function mainMenu_settings(workingData, interaction) {
    interaction.reply(uiBuilders.settings(workingData, interaction, 0));
}

//REPLY with user leaderboard UI
function mainMenu_userLeaderboard(workingData, interaction, realtimeStockData) {
    interaction.reply(uiBuilders.userLeaderboard(workingData, interaction, realtimeStockData, 0));
}

//REPLY with message leaderboard UI
async function mainMenu_msgLeaderboard(client, workingData, interaction) {
    let leaderboardUI = await uiBuilders.msgLeaderboard(client, workingData, interaction, 0);

    interaction.reply(leaderboardUI);
}

//REPLY with changelog UI
function mainMenu_changelog(interaction) {
    interaction.reply(uiBuilders.changelog(0));
}

//REPLY with stock exchange UI
function mainMenu_stockExchange(workingData, interaction, realtimeStockData) {
    interaction.reply(uiBuilders.stockExchange(workingData, interaction, realtimeStockData, 0));
}

//UPDATE to main page of help UI
function mainHelp_back(interaction) {
    interaction.update(uiBuilders.mainHelp("main"));
}

//UPDATE to previous page of current help UI section
function mainHelp_prev(interaction, eventTokens) {
    let section = eventTokens.shift();
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.mainHelp(section, pagenum - 1));
}

//UPDATE to next page of current help UI section
function mainHelp_next(interaction, eventTokens) {
    let section = eventTokens.shift();
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.mainHelp(section, pagenum + 1));
}

//UPDATE to selected section of help UI
function mainHelp_sectionButton(interaction, eventTokens) {
    interaction.update(uiBuilders.mainHelp(eventTokens.shift(), 0));
}

//UPDATE to previous page of message leaderboard
async function msgLeaderboard_prev(client, workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());
    let leaderboardUI = await uiBuilders.msgLeaderboard(client, workingData, interaction, pagenum - 1);

    interaction.update(leaderboardUI);
}

//UPDATE to next page of message leaderboard
async function msgLeaderboard_next(client, workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());
    let leaderboardUI = await uiBuilders.msgLeaderboard(client, workingData, interaction, pagenum + 1);

    //send leaderboard message
    interaction.update(leaderboardUI);
}

function userLeaderboard_prev(workingData, interaction, realtimeStockData, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.userLeaderboard(workingData, interaction, realtimeStockData, pagenum - 1));
}

function userLeaderboard_next(workingData, interaction, realtimeStockData, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.userLeaderboard(workingData, interaction, realtimeStockData, pagenum + 1));
}

function changelog_prev(interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.changelog(pagenum - 1));
}

function changelog_next(interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.changelog(pagenum + 1));
}

//UPDATE to previous page of settings menu
function settings_prev(workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.settings(workingData, interaction, pagenum - 1));
}

//UPDATE to next page of settings menu
function settings_next(workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.settings(workingData, interaction, pagenum + 1));
}

//change selected value of user's settings OR send modal to prompt user input for new setting value
function settings_editSettingValue(workingData, interaction, eventTokens) {
    //get user's setting object
    let settingName = eventTokens.shift();
    let pageNum = eventTokens.shift();

    let settingObj = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    }).settings.find(obj => {
        return obj.name == settingName;
    });

    switch (settingObj.valueType) {
        case "boolean":
            //no need to call new UI builder. Simply swap the value.
            settingObj.value = !settingObj.value;
            interaction.update(uiBuilders.settings(workingData, interaction, pageNum, settingName));
            break;
        
        case "mm/dd":
            let modal = new ModalBuilder()
                .setCustomId(["settings", "submitModal", settingName, pageNum].join('-'))
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
}

//handle received modal interaction for setting value change and either change user's setting value OR UPDATE menu to display error message
function settings_submitModal(workingData, interaction, eventTokens, birthdayDirectory) {
    let settingName = eventTokens.shift();
    let pagenum = eventTokens.shift();

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
                interaction.update(uiBuilders.settings(workingData, interaction, pagenum, settingName));
                birthdayDirectory[interaction.guildId] = utils.getUpdatedBirthdayDirectory(workingData, interaction.guildId);
            } else {
                //invalid entry
                interaction.update(uiBuilders.settings(workingData, interaction, pagenum, "INVALIDENTRY"));
            }
            break;
    }
}

//UPDATE to usables shop page 0
function shopCategories_usables(interaction, shopPages_usables) {
    interaction.update(uiBuilders.usablesShop(shopPages_usables, 0))
}

//UPDATE to equipment shop page 0
function shopCategories_equipment(interaction, shopPages_equipment, shopPages_equipmentDirectory) {
    interaction.update(uiBuilders.equipsShop(shopPages_equipment, shopPages_equipmentDirectory, 0))
}

//UPDATE to others shop page 0
function shopCategories_others() {
    //NOTE: not yet implemented
}

//UPDATE to previous page of usables shop
function usablesShop_prev(interaction, eventTokens, shopPages_usables) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.usablesShop(shopPages_usables, pagenum - 1))
}

//UPDATE to next page of usables shop
function usablesShop_next(interaction, eventTokens, shopPages_usables) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.usablesShop(shopPages_usables, pagenum + 1));
}

//UPDATE to item information page of selected item in usables shop
function usablesShop_shelf(workingData, interaction, eventTokens) {
    interaction.update(uiBuilders.usablesShopItemInfo(workingData, interaction, eventTokens));
}

//UPDATE to usables shop page 0
function usablesShopItemInfo_back(interaction, shopPages_usables) {
    interaction.update(uiBuilders.usablesShop(shopPages_usables, 0));
}

//handle purchasing items from usables shop and either send a success or failure message
function usablesShopItemInfo_purchase(workingData, interaction, eventTokens) {
    //get item name and info
    let itemName = eventTokens.shift();
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
                .setCustomId(["usablesShopItemInfo", "back"].join('-'))
                .setStyle(ButtonStyle.Danger)
                .setLabel("Back")
        )

    interaction.update({
        content: bold("===================\nPurchase Complete!\n===================\nObtained " + pCount + "x " + itemInfo.displayName + ".\nLost " + (pCount*finalPrice) + " EB."),
        ephemeral: true,
        components: [row]
    });
}

function equipsShop_prev(interaction, eventTokens, shopPages_equipment, shopPages_equipmentDirectory) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.equipsShop(shopPages_equipment, shopPages_equipmentDirectory, pagenum - 1));
}

function equipsShop_next(interaction, eventTokens, shopPages_equipment, shopPages_equipmentDirectory) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.equipsShop(shopPages_equipment, shopPages_equipmentDirectory, pagenum + 1));
}

function equipsShop_shelf(interaction, eventTokens) {
    interaction.update(uiBuilders.equipsShopItemInfo(eventTokens));
}

function equipsShopItemInfo_back(interaction, shopPages_equipment, shopPages_equipmentDirectory) {
    interaction.update(uiBuilders.equipsShop(shopPages_equipment, shopPages_equipmentDirectory, 0));
}

function equipsShopItemInfo_purchase(workingData, interaction, eventTokens) {
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
                .setCustomId(["equipsShopItemInfo", "back"].join('-'))
                .setStyle(ButtonStyle.Danger)
                .setLabel("Back")
        )

    interaction.update({
        content: bold("===================\nPurchase Complete!\n===================\nObtained " + itemInfo.displayName + ".\nLost " + itemInfo.price + " EB."),
        ephemeral: true,
        components: [row]
    });
}

function usablesInv_prev(workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.usablesInv(workingData, interaction, pagenum - 1));
}

function usablesInv_next(workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.usablesInv(workingData, interaction, pagenum + 1));
}

function usablesInv_equips(workingData, interaction) {
    interaction.update(uiBuilders.equipsInv(workingData, interaction, 0));
}

function usablesInv_invSpace(workingData, interaction, eventTokens) {
    let itemName = eventTokens.shift();

    interaction.update(uiBuilders.usablesInvItemInfo(workingData, interaction, itemName));
}

function usablesInvItemInfo_back(workingData, interaction) {
    interaction.update(uiBuilders.usablesInv(workingData, interaction, 0))
}

function usablesInvItemInfo_use(client, workingData, interaction, eventTokens) {
    usableItemsFunctionalities(client, workingData, interaction, eventTokens);
}

function equipsInv_prev(workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.equipsInv(workingData, interaction, pagenum - 1));
}

function equipsInv_next(workingData, interaction, eventTokens) {
    let pagenum = parseInt(eventTokens.shift());

    interaction.update(uiBuilders.equipsInv(workingData, interaction, pagenum + 1));
}

function equipsInv_usables(workingData, interaction) {
    interaction.update(uiBuilders.usablesInv(workingData, interaction, 0));
}

function equipsInv_invSpace(workingData, interaction, eventTokens) {
    let itemSlot = eventTokens.shift();
    let itemName = eventTokens.shift();

    interaction.update(uiBuilders.equipsInvItemInfo(workingData, interaction, itemSlot, itemName));
}

function equipsInvItemInfo_back(workingData, interaction) {
    interaction.update(uiBuilders.equipsInv(workingData, interaction, 0));
}

function equipsInvItemInfo_equip(workingData, interaction, eventTokens) {
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

    interaction.update(uiBuilders.equipsInvItemInfo(workingData, interaction, itemSlot, itemName));
}

function stockExchange_selectStock(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens) {
    let stockTicker = eventTokens.shift();

    uiBuilders.stockExchangeStockInfo(workingData, interaction, realtimeStockData, tenDayStockData, stockTicker).then(ui => {
        interaction.update(ui);
    });
}

function stockExchange_refresh(workingData, interaction, realtimeStockData) {
    interaction.update(uiBuilders.stockExchange(workingData, interaction, realtimeStockData, 0));
}

function stockExchangeStockInfo_back(workingData, interaction, realtimeStockData) {
    interaction.update(uiBuilders.stockExchange(workingData, interaction, realtimeStockData, 0));
}

function stockExchangeStockInfo_refresh(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens) {
    let stockTicker = eventTokens.shift();

    uiBuilders.stockExchangeStockInfo(workingData, interaction, realtimeStockData, tenDayStockData, stockTicker).then(ui => {
        interaction.update(ui);
    })
}

function stockExchangeStockInfo_invest(workingData, interaction, realtimeStockData, eventTokens) {
    let stockTicker = eventTokens.shift();
    let action = eventTokens.shift();

    switch (action) {
        case "initial":
            let modal = new ModalBuilder()
                .setCustomId(["stockExchangeStockInfo", "invest", stockTicker, "modalSubmit"].join('-'))
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
            break;

        case "modalSubmit":
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
                            .setCustomId(["stockExchangeStockInfo", "refresh", stockTicker].join('-'))
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
                            .setCustomId(["stockExchangeStockInfo", "refresh", stockTicker].join('-'))
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
                            .setCustomId(["stockExchangeStockInfo", "refresh", stockTicker].join('-'))
                            .setStyle(ButtonStyle.Danger)
                            .setLabel("Back")
                    )

            interaction.update({
                content: "Investment Successful!",
                components: [backButtonRow],
                files: [],
                ephemeral: true
            });
            break
    }
}

function stockExchangeStockInfo_sell(workingData, interaction, realtimeStockData, eventTokens) {
    let stockTicker = eventTokens.shift();

    interaction.update(uiBuilders.stockExchangeSellStocks(workingData, interaction, realtimeStockData, stockTicker, 0));
}

function stockExchangeSellStocks_sell(workingData, interaction, realtimeStockData, eventTokens) {
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

    interaction.update(uiBuilders.stockExchangeSellStocks(workingData, interaction, realtimeStockData, [stockTicker], 0, `You've sold $${stockTicker} stock and gained ${finalInvestmentValue} EB!`))
}

function stockExchangeSellStocks_prev(workingData, interaction, realtimeStockData, eventTokens) {
    let pagenum = eventTokens.shift();
    let stockTicker = eventTokens.shift();

    interaction.update(uiBuilders.stockExchangeSellStocks(workingData, interaction, realtimeStockData, stockTicker, pagenum - 1));
}

function stockExchangeSellStocks_next(workingData, interaction, realtimeStockData, eventTokens) {
    let pagenum = eventTokens.shift();
    let stockTicker = eventTokens.shift();

    interaction.update(uiBuilders.stockExchangeSellStocks(workingData, interaction, realtimeStockData, stockTicker, pagenum + 1));
}

function stockExchangeSellStocks_back(workingData, interaction, realtimeStockData, tenDayStockData, eventTokens) {
    let stockTicker = eventTokens.shift();

    interaction.update(uiBuilders.stockExchangeStockInfo(workingData, interaction, realtimeStockData, tenDayStockData, stockTicker));
}

//=====================================================================================================================================

module.exports = {
    mainMenu_changelog, mainMenu_findTreasure, mainMenu_help, mainMenu_msgLeaderboard, mainMenu_openInv, mainMenu_shop, mainMenu_showStats, mainMenu_userLeaderboard, mainMenu_settings, mainMenu_stockExchange,
    settings_editSettingValue, settings_prev, settings_next, settings_submitModal,
    changelog_prev, changelog_next,
    msgLeaderboard_next, msgLeaderboard_prev,
    userLeaderboard_prev, userLeaderboard_next,
    mainHelp_back, mainHelp_prev, mainHelp_next, mainHelp_sectionButton,
    shopCategories_usables, shopCategories_equipment, shopCategories_others,
    usablesShop_prev, usablesShop_next, usablesShop_shelf,
    usablesShopItemInfo_back, usablesShopItemInfo_purchase,
    equipsShop_shelf, equipsShop_prev, equipsShop_next,
    equipsShopItemInfo_back, equipsShopItemInfo_purchase,
    usablesInv_prev, usablesInv_next, usablesInv_invSpace, usablesInv_equips,
    usablesInvItemInfo_back, usablesInvItemInfo_use,
    equipsInv_prev, equipsInv_next, equipsInv_usables, equipsInv_invSpace,
    equipsInvItemInfo_back, equipsInvItemInfo_equip,
    stockExchange_refresh, stockExchange_selectStock,
    stockExchangeStockInfo_back, stockExchangeStockInfo_refresh, stockExchangeStockInfo_invest, stockExchangeStockInfo_sell,
    stockExchangeSellStocks_sell, stockExchangeSellStocks_prev, stockExchangeSellStocks_next, stockExchangeSellStocks_back
}
