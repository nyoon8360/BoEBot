//===================================================
//                Config Constants
//===================================================

//common config consts
const reactCooldown = config.common.reactCooldown; //how long users must wait in between awarding edbucks in seconds
const msgExpiration = config.common.msgExpiration; //how long a message can be awarded edbucks for in seconds
const reactAward = config.common.reactAward; //how many edbucks awarded for reactions
const treasureLR = config.common.treasureLowerRange; //min possible number of edbucks found on pressing "Pick Up Edbucks" button
const treasureUR = config.common.treasureUpperRange; //max possible number of edbucks found on pressing "Pick Up Edbucks" button
const treasureCDLR = config.common.treasureCooldownLowerRange; //min possible number of seconds the "Pick Up Edbucks" button will be disabled for
const treasureCDUR = config.common.treasureCooldownUpperRange; //max possible number of seconds the "Pick Up Edbucks" button will be disabled for
const userLeaderboardEntriesPerPage = config.common.userLeaderboardEntriesPerPage; //max number of entries that will show on the user leaderboard
const msgLeaderboardLimit = config.common.msgLeaderboardLimit; //max number of entries that will show on the message leaderboard
const currencyEmojiName = config.common.currencyEmojiName; //the name of the emoji used to award currency
const botAdmins = config.common.admins; //list of user ids that are able to run admin commands for the bot
const saveInterval = config.common.saveInterval; //the interval between json file autosaves
const usablesShopItemsPerRow = config.common.usablesShopItemsPerRow > 5 ? 5 : config.common.usablesShopItemsPerRow; //the number of items displayed per row in the item shop. maxed at 5
const usablesInventoryItemsPerRow = config.common.usablesInventoryItemsPerRow > 5 ? 5 : config.common.usablesInventoryItemsPerRow; //number of items displayed per row in player inventories. maxed at 5
const checkActiveVCInterval = config.common.checkActiveVCInterval;
const activeVCMemberThreshold = config.common.activeVCMemberThreshold;
const activeVCReward = config.common.activeVCReward;

//item config consts
const itemMuteDuration = config.items.itemMuteDuration;
const itemReflectDuration = config.items.itemReflectDuration;
const itemPolymorphDuration = config.items.itemPolymorphDuration;
const itemTimeoutDuration = config.items.itemTimeoutDuration;
const itemEMPDuration = config.items.itemEMPDuration;