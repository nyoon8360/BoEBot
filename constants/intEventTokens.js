//===================================================
//             Interact Event Tokens
//===================================================
//String tokens to be sent on emitted interact events that will be parsed and handled accordingly by event handlers

module.exports = Object.freeze({
    //Common tokens
    mainMenuPrefix: "MAINMENU-",
    shopCategoryPrefix: "SELECTSHOPCATEGORY-",

    //Usables shop tokens
    usablesShopSelectShelfPrefix: "USABLESSHOPSELECTSHELF-",
    usablesShopPurchaseMenuPrefix: "USABLESSHOPPURCHASEMENU-",
    usablesShopNavPagesPrefix: "USABLESSHOPNAVPAGES-",

    //Equip shop tokens
    equipShopSelectShelfPrefix: "EQUIPSHOPSELECTSHELF-",

    //Others shop tokens
    otherShopSelectShelfPrefix: "OTHERSHOPSELECTSHELF-",

    //Player usables inventory tokens
    playerUsablesInvSelectSlotPrefix: "PUSABLESINVSELECTSLOT-",
    playerUsablesInvInfoPrefix: "PUSABLESINVINFO-",
    playerUsablesInvNavPrefix: "PUSABLESINVNAV-",

    //Changelog navigation tokens
    changelogNavPrefix: "CHANGELOGNAV-",

    //User leaderboard navigation tokens
    userLeaderboardNavPrefix: "USERLEADERBOARDNAV-"
});

