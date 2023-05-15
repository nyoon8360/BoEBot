//===================================================
//             Interact Event Tokens
//===================================================
//String tokens to be sent on emitted interact events that will be parsed and handled accordingly by event handlers

module.exports = Object.freeze({
    //Common tokens
    mainMenuPrefix: "MAINMENU-",
    shopCategoryPrefix: "SELECTSHOPCATEGORY-",

    //Settings tokens
    settingsEditValuePrefix: "SETTINGSEDITVALUE-",
    settingsNavPrefix: "SETTINGSNAVPAGES-",

    //Usables shop tokens
    usablesShopSelectShelfPrefix: "USABLESSHOPSELECTSHELF-",
    usablesShopPurchaseMenuPrefix: "USABLESSHOPPURCHASEMENU-",
    usablesShopNavPagesPrefix: "USABLESSHOPNAVPAGES-",

    //Equip shop tokens
    equipShopSelectShelfPrefix: "EQUIPSHOPSELECTSHELF-",
    equipShopPurchaseMenuPrefix: "EQUIPSHOPPURCHASEMENU-",
    equipShopNavPagesPrefix: "EQUIPSHOPNAVPAGES-",

    //Others shop tokens
    otherShopSelectShelfPrefix: "OTHERSHOPSELECTSHELF-",

    //Player usables inventory tokens
    playerUsablesInvSelectSlotPrefix: "PUSABLESINVSELECTSLOT-",
    playerUsablesInvInfoPrefix: "PUSABLESINVINFO-",
    playerUsablesInvNavPrefix: "PUSABLESINVNAV-",

    //Player equips inventory tokens
    playerEquipsInvSelectSlotPrefix: "PEQUIPSINVSELECTSLOT-",
    playerEquipsInvInfoPrefix: "PEQUIPSINVINFO-",
    playerEquipsInvNavPrefix: "PEQUIPSINVNAV-",

    //Changelog navigation tokens
    changelogNavPrefix: "CHANGELOGNAV-",

    //User leaderboard navigation tokens
    userLeaderboardNavPrefix: "USERLEADERBOARDNAV-",

    //Stock exchange tokens
    stockExchangeNavPrefix: "STOCKEXCHANGENAV-",
    stockExchangeSelectStockPrefix: "STOCKEXCHANGESELECTSTOCK-",
    stockExchangeInfoPagePrefix: "STOCKEXCHANGEINFO-",
    stockExchangeSellPagePrefix: "STOCKEXCHANGESELLPAGE-"
});

