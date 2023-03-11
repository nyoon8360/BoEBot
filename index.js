require('dotenv').config();
const { Client, IntentsBitField, ButtonStyle, time } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
//import { setTimeout } from 'timers/promises';

/*
axios for easy HTTP promises with node.js
dotenv for loading environment variables from .env file
fs for reading/writing/editing json files
*/

/*
database.json format:

{
    "users": [
        {
            "tag":"string with discord user's tag i.e 'inspirasian#1234'",
            "balance": 0,
            "lastAwarded": 1678310667 this will be a number using epoch unix timestamp in seconds
        }
    ]
}
*/

// NOTE: Make sure to update intents if new events not in current intents are needed to be listened to
const client = new Client({
     intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildScheduledEvents
    ]
});

const reactCooldown = config.reactCooldown; //how long users must wait in between awarding edbucks in seconds
const msgExpiration = config.msgExpiration; //how long a message can be awarded edbucks for in seconds
const reactAward = config.reactAward; //how many edbucks awarded for reactions
const treasureLR = config.treasureLowerRange;
const treasureUR = config.treasureUpperRange;
const treasureCDLR = config.treasureCooldownLowerRange;
const treasureCDUR = config.treasureCooldownUpperRange;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    //set bot status
    /*
    client.user.setStatus('available');
    client.user.setActivity('Use \'>help\' to see my commands!', {
        type: "LISTENING"
    });
    */
});

client.on('messageReactionAdd', (messageReaction, user) => {
    //base system for awarding edbucks to users whose msgs get edbuck reactions

    jsonReader("./database.json", (error, data) => {
        //catch error if jsonReader() returned an error
        if (error) {
            console.log(error);
            return;
        }

        //do a time check for the reactor
        let storedUserData = data.users.filter(obj => {
            return obj.tag == user.tag;
        });

        let currTime = Math.floor(Date.now() / 1000);

        if (currTime - storedUserData.lastAwarded >= reactCooldown) {
            //do a time check for the reacted to message

            /*
            TODO: not sure in what units the createdTimestamp returns so investigate this
            currently assuming it is in epoch unix timestamp in seconds
            */ 
            if (currTime - messageReaction.message.createdTimestamp <= msgExpiration) {
                let recipient = data.users.filter(obj => {
                    return obj.tag == messageReaction.message.author.tag;
                });

                recipient.balance += reactAward;

                //update lastAwarded parameter of the reactor to the current time 
                storedUserData.lastAwarded = Math.floor(Date.now() / 1000);

                //update fun stats
                storedUserData.fStatReactionsAwarded += 1;
                recipient.fStatReactionsReceived += 1;

                fs.writeFile("./database.json", JSON.stringify(data), error => {
                    if (error) console.log("Error writing to file: \n"  + error);
                });
            } else {
                // TODO: create a msg only seen by the reactor that says the message has expired
            }
        } else {
            //TODO: create a msg only seen by the reactor that says they cant award edbucks yet
        }
    });
});

//event listener for buttons
client.on('interactionCreate', interaction => {
    //if interaction is not a button then return
    if (!interaction.isButton()) return;

    //switch for code for different buttons
    switch(interaction.customId) {
        case "showstats":
            //show user stats
            jsonReader("./database.json", (error, data) => {
                if (error) {
                    console.log(error);
                    return;
                }

                let requester = data.users.filter(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let lastAwarded = time(requester.lastAwarded, "R");

                interaction.reply({
                    content: `
                    ====================
                         Your Stats
                    ====================
                    Edbuck Balance: ${requester.balance}
                    Last Edbuck Awarded: ${lastAwarded}
                    `,
                    ephemeral: true
                })
            });

            break;
        
        case "openinv":
            break;

        case "findtreasure":
            //on click, award treasure, deactivate this button for a random amount of hours, and then reactivate
            jsonReader("./database.json", (error, data) => {
                if (error) {
                    console.log(error);
                    return;
                }

                let user = data.users.filter(obj => {
                    return obj.tag == interaction.user.tag;
                });

                let treasure = Math.floor(Math.random * (treasureUR - treasureLR)) + treasureLR;
                user.balance += treasure;

                fs.writeFile("./database.json", JSON.stringify(data), error => {
                    if (error) console.log("Error writing to file: \n"  + error);
                });

                interaction.reply({
                    content: `
                    You've found ${treasure} edbucks dropped by a wild Edwin!
                    All the local Edwins have been spooked back into hiding.
                    Check back again later to see if they've come back!
                    `,
                    ephemeral: true
                })
            });

            interaction.component.setDisabled(true);

            //re-enable button after cooldown
            (async (interaction) => {
                let timeoutDuration = Math.floor(Math.random * (treasureCDUR - treasureCDLR)) + treasureCDLR;
                //TEST REMOVE AND REWRITE LATER
                console.log("Treasure set on cooldown for: " + timeoutDuration + " seconds.");
                await setTimeout(timeoutDuration * 1000);
    
                interaction.component.setDisabled(false);
            })(interaction);

            //TEST DELETE LATER
            console.log("Treasure cooldown ended and button re-enabled.");
            break;
    }
});

//===================================================
//all client event listeners must be before this line
//===================================================
client.login(process.env.CLIENT_TOKEN);

function addEB(user, amount) {

}

function removeEB(user, amount) {
    //do a check if the user has enough EB and if not return false
}

function jsonReader(filePath, callBack) {
    fs.readFile(filePath, (error, fileData) => {
        //catch if readFile() returned an error
        if (error) {
            //if there is a callback, return callback(erorr).
            //if there is no callback, return callback which would be undefined
            return callBack && callBack(error);
        }

        try {
            //attempt to parse the file data passed from readFile
            const data = JSON.parse(fileData);
            return callBack && callBack(null, data);
        } catch (error) {
            return callBack && callBack(error);
        }
    })
}

//returns message composing the main menu of the discord bot
function openMenu() {
    let row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('showstats')
            .setLabel('Show Stats')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('openinv')
            .setLabel('Open Inventory')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('findtreasure')
            .setLabel('Pick Up Edbucks')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('money_with_wings')
    );
    return {
        content: "Main Menu",
        components: [row]
    };
}