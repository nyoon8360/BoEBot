const config = require('../config.json');
//===================================================
//                Config Constants
//===================================================

module.exports = Object.freeze({
    //common config constants
    reactCooldown: config.common.reactCooldown, //how long users must wait in between awarding edbucks in seconds
    msgExpiration: config.common.msgExpiration, //how long a message can be awarded edbucks for in seconds
    reactAward: config.common.reactAward, //how many edbucks awarded for reactions
    treasureLR: config.common.treasureLowerRange, //min possible number of edbucks found on pressing "Pick Up Edbucks" button
    treasureUR: config.common.treasureUpperRange, //max possible number of edbucks found on pressing "Pick Up Edbucks" button
    treasureCDLR: config.common.treasureCooldownLowerRange, //min possible number of seconds the "Pick Up Edbucks" button will be disabled for
    treasureCDUR: config.common.treasureCooldownUpperRange, //max possible number of seconds the "Pick Up Edbucks" button will be disabled for
    userLeaderboardEntriesPerPage: config.common.userLeaderboardEntriesPerPage, //max number of entries that will show on the user leaderboard
    msgLeaderboardLimit: config.common.msgLeaderboardLimit, //max number of entries that will show on the message leaderboard
    currencyEmojiName: config.common.currencyEmojiName, //the name of the emoji used to award currency
    botAdmins: config.common.admins, //list of user ids that are able to run admin commands for the bot
    saveInterval: config.common.saveInterval, //the interval between json file autosaves
    usablesShopItemsPerRow: config.common.usablesShopItemsPerRow > 5 ? 5 : config.common.usablesShopItemsPerRow, //the number of items displayed per row in the item shop. maxed at 5
    usablesInventoryItemsPerRow: config.common.usablesInventoryItemsPerRow > 5 ? 5 : config.common.usablesInventoryItemsPerRow, //number of items displayed per row in player inventories. maxed at 5
    checkActiveVCInterval: config.common.checkActiveVCInterval, //number of seconds between checks of a VC to check if it's active to award currency
    activeVCMemberThreshold: config.common.activeVCMemberThreshold, //number of unmuted guild members needed in a VC to count as active
    activeVCReward: config.common.activeVCReward, //amount of currency to award to those in an active VC
    equipsInvItemsPerRow: config.common.equipsInventoryItemsPerRow, //number of items to display per row in player equipment inventories
    equipsShopItemsPerRow: config.common.equipsShopItemsPerRow, //number of items to display per row in equipment shop
    bdayWisherReward: config.common.bdayWisherReward, //amount of currency to award to the birthday wisher when performing a valid birthday wish
    bdayReceiverReward: config.common.bdayReceiverReward, //amount of currency to award to the birthday wish receiver when receiving a valid birthday wish
    
    //item config constants
    itemMuteDuration: config.items.itemMuteDuration,
    itemReflectDuration: config.items.itemReflectDuration,
    itemPolymorphDuration: config.items.itemPolymorphDuration,
    itemTimeoutDuration: config.items.itemTimeoutDuration,
    itemEMPDuration: config.items.itemEMPDuration,

    //stocks config consts
    realtimeStockDataLifetime: config.stocks.realtimeStockDataLifetime, //the life time of real time stock data before needing an update
    trackedStocks: config.stocks.trackedStocks, //an array of strings denoting the tickers of the stocks being offered in the stock exchange menu
});