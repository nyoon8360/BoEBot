const fs = require('fs');
//===================================================
//===================================================
//
//                UTILITY FUNCTIONS
//
//===================================================
//===================================================

//return object with default values for new users in database
function getNewUserJSON(userTag, userId) {
    userObj = {
        tag: userTag,
        id: userId,
        lastAwarded: 0,
        balance: 10,
        queuedForUnmute: false,
        lastChangedMsg: {},
        itemInventory: [],
        equipmentInventory: {
            head: [],
            body: [],
            trinket: [],
            shoes: []
        },
        statusEffects: [],
        equipped: {},
        settings: [
            /*
            NOTE: ALWAYS add new settings to the END of the settings array to ensure user settings
            are properly updated on startup.
            */
            {
                name: "pingOnTargetted",
                description: "Get pinged when targetted by item.",
                value: false,
                valueType: "boolean",
                changeable: true
            },
            {
                name: "userBirthday",
                description: "Birthday (CAN ONLY EDIT THIS ONCE)",
                value: "",
                valueType: "mm/dd",
                changeable: true
            }
        ],
        fStatReactionsAwarded: 0,
        fStatReactionsReceived: 0,
        fStatItemsUsed: 0,
        fStatHighestBal: 0
    }

    return userObj;
}

//function to save workingdata to json databases
function saveData(client, workingData, sync) {
    client.guilds.cache.map(guild => guild.id).forEach((guildId) => {
        if (sync) {
            fs.writeFileSync('./databases/database' + guildId + '.json', JSON.stringify(workingData[guildId], null, 2));
        } else {
            fs.writeFile('./databases/database' + guildId + '.json', JSON.stringify(workingData[guildId], null, 2), error => {
                if (error) console.log("Error writing to file: \n" + error);
            });
        }
    });
}

function checkStatsAndEffects(workingData, interaction, targetId, getRawChances) {
    //TODO: If a lot of stats and effects are added then add a filter parameter to the function signature that will only check and update
    //the selected stats and effects in the filter object parameter.
    let passedEffectsAndStats = {
        effects: [],
        stats: {
            //NOTE: Add all existing stats here with default value of 0
            reflectChance: 0,
            treasureLuck: 0,
            vocalLuck: 0,
            reactionBonus: 0,
            usableCrit: 0,
            usablesDiscount: 0
        }
    };

    //List of stats that are chance based
    //NOTE: Update this whenever a new chance stat is added
    let chanceStats = ["reflectChance", "treasureLuck", "vocalLuck", "usableCrit"];

    //instantiate return array with passed stat checks/status effects
    let effects = [];

    //get the target's data
    let targetData = workingData[interaction.guildId].users.find(obj => {
        return obj.id == targetId;
    });

    //get current time in seconds since epoch
    let currentTime = Math.floor(Date.now()/1000);

    //check status effects and roll for checks if applicable
    let statusEffects = targetData.statusEffects;

    for (let i = 0; i < statusEffects.length; i++) {
        switch(statusEffects[i].name) {
            case "reflect":
                if (statusEffects[i].expires >= currentTime) {
                    effects.push("reflect");
                } else {
                    statusEffects.splice(i, 1);
                    i--;
                }
                break;
        }
    }

    passedEffectsAndStats.effects = effects;

    //aggregate stats
    let equippedItems = [];

    Object.keys(targetData.equipmentInventory).forEach(key => {
        let foundEquip = targetData.equipmentInventory[key].find(obj => {
            return obj.equipped == true;
        });
        if (foundEquip != undefined) equippedItems.push(foundEquip);
    });

    equippedItems.forEach(obj => {
        passedEffectsAndStats.stats[obj.effectingStat] += obj.effectAmount;
    });

    //roll any chance stats
    if (!getRawChances) {
        Object.keys(passedEffectsAndStats.stats).forEach(key => {
            if (chanceStats.includes(key)) {
                let roll = Math.round(Math.random() * 99) + 1;
    
                passedEffectsAndStats.stats[key] = roll <= passedEffectsAndStats.stats[key] ? 1 : 0;
            }
        });
    }

    return passedEffectsAndStats;
}

function getStatusEffectObject(name, expires, additionalProps) {
    let returnedEffectObj = {
        name: name,
        expires: expires
    };

    switch (name) {
        case "reflect":
            returnedEffectObj.displayName = "Reflect";
            break;

        case "muted":
            returnedEffectObj.displayName = "Muted";
            break;

        case "polymorph":
            returnedEffectObj.displayName = "Polymorphed";
            break;
    }

    returnedEffectObj = Object.assign(returnedEffectObj, additionalProps);
    return returnedEffectObj;
}

function getUpdatedBirthdayDirectory(workingData, guildId) {
    let bdayDirectory = {};

    workingData[guildId].users.forEach(obj => {
        let userBdaySetting = obj.settings.find(setting => {
            return setting.name == 'userBirthday';
        });

        if (userBdaySetting.value) {
            let parsedBday = userBdaySetting.value.split("/");
            bdayDirectory[obj.id] = {month: parseInt(parsedBday[0]), day: parseInt(parsedBday[1])};
        }
    });

    return bdayDirectory;
}

module.exports = { getNewUserJSON, saveData, checkStatsAndEffects, getStatusEffectObject, getUpdatedBirthdayDirectory };