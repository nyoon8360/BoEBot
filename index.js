require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');

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
            "lastAwarded": 1678310667 this will be an integer using epoch unix timestamp
        }
    ]
}

*/

//TODO create a config json file for configuration variables like ebCooldown and msgExpiration
const client = new Discord.Client();
const ebCooldown = 3600; //how long users must wait in between awarding edbucks in seconds
const msgExpiration = 3600; //how long a message can be awarded edbucks for in seconds

client.on('ready', () => {
    console.log('Logged in as ${client.user.tag}!');
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

        if (currTime - storedUserData.lastAwarded >= ebCooldown) {
            //do a time check for the reacted to message

            /*
            TODO not sure in what units the createdTimestamp returns so investigate this
            currently assuming it is in epoch unix timestamp in seconds
            */ 
            if (currTime - messageReaction.message.createdTimestamp <= msgExpiration) {
                let recipient = data.users.filter(obj => {
                    return obj.tag == messageReaction.message.author.tag;
                });

                recipient.balance += 1;

                //update lastAwarded parameter of the reactor to the current time 
                storedUserData.lastAwarded = Math.floor(Date.now() / 1000);

                fs.writeFile("./database.json", JSON.stringify(data), error => {
                    if (error) console.log("Error writing to file: \n"  + error);
                });
            } else {
                // TODO create a msg only seen by the reactor that says the message has expired
            }
        } else {
            //TODO create a msg only seen by the reactor that says they cant award edbucks yet
        }
    });
});

//all client event listeners must be before this line
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