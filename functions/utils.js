const fs = require('fs');

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
        birthday: "",
        queuedForUnmute: false,
        lastChangedMsg: {},
        itemInventory: [],
        equipmentInventory: [],
        statusEffects: [],
        equipped: {},
        settings: {},
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
            fs.writeFileSync('./database' + guildId + '.json', JSON.stringify(workingData[guildId], null, 2));
        } else {
            fs.writeFile('./database' + guildId + '.json', JSON.stringify(workingData[guildId], null, 2), error => {
                if (error) console.log("Error writing to file: \n" + error);
            });
        }
    });
}

function checkStatsAndEffects(workingData, interaction, targetId) {
    //instantiate return array with passed stat checks/status effects
    let passedStatsAndEffects = [];

    //get the target's data
    let targetData = workingData[interaction.guildId].users.find(obj => {
        return obj.id == targetId;
    });

    //get current time in seconds since epoch
    let currentTime = Math.floor(Date.now()/1000);

    //TODO: once equips are implemented, aggregate stats and do roll checks on them

    //check status effects and roll for checks if applicable
    let statusEffects = targetData.statusEffects;

    for (let i = 0; i < statusEffects.length; i++) {
        switch(statusEffects[i].name) {
            case "reflect":
                if (statusEffects[i].expires >= currentTime) {
                    passedStatsAndEffects.push("reflect");
                } else {
                    statusEffects.splice(i, 1);
                    i--;
                }
                break;
        }
    }

    return passedStatsAndEffects;
}

function getStatusEffectObject(name, expiration, additionalProps) {
    let returnedEffectObj = {
        name: name,
        expiration: expiration
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

    Object.assign(returnedEffectObj, additionalProps);
    return returnedEffectObj;
}