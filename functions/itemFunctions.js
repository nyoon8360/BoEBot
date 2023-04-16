const { ButtonStyle, time, ActionRowBuilder, ButtonBuilder, underscore, EmbedBuilder, TextInputBuilder, TextInputStyle, userMention, ModalBuilder, UserSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const intEventTokens = require('../constants/intEventTokens.js');
const config = require('../constants/configConsts.js');
const utils = require('./utils.js');
const uiBuilders = require('./uiBuilders.js');

//===================================================
//===================================================
//
//        Item Functionalities Implementations
//
//===================================================
//===================================================

const itemFunctionMap = new Map();

//function to call the appropriate code for given item.
function usableItemsFunctionalities(client, workingData, interaction, eventTokens) {
    itemFunctionMap.get(eventTokens.shift())(client, workingData, interaction, eventTokens);
}

const defaultOptions = {
    preventSelfUse: true,
    vcUserUseOnly: false
}

function templateItemFunction(client, workingData, interaction, eventTokens, options) {
    if (options) {
        let defaultOptionsCopy = {...defaultOptions};
        options = Object.assign(defaultOptionsCopy, options);
    } else {
        options = defaultOptions;
    }

    //get caster data, member object, and stats/effects
    let casterData = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });
    let casterMemberObj = interaction.member;
    let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

    //get target data, member object, stats/effects, and settings
    let targetData = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.values[0];
    });
    let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);
    let targetStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, targetMemberObj.user.id);
    let targetSettings = targetData.settings;

    //check if caster still has item
    let usedItemInvEntryIndex = casterData.itemInventory.findIndex(obj => {
        return obj.name == "item_kick";
    });

    if (usedItemInvEntryIndex < 0) {
        interaction.update(uiBuilders.notifDontHaveItem());
        return;
    }

    if (options.preventSelfUse) {
        //prevent self use
        if (targetMemberObj.user.id == casterData.id) {
            interaction.update(uiBuilders.notifCantSelfUse());
            return;
        }
    }

    //prevent use on someone not in VC
    if (!targetMemberObj.voice.channelId) {
        interaction.update(uiBuilders.notifTargetNotInVC());
        return;
    }

    if (options.vcUserUseOnly) {
        //prevent use on someone not in VC
        if (!targetMemberObj.voice.channelId) {
            interaction.update(uiBuilders.notifTargetNotInVC());
            return;
        }
    }

    //consume item
    if (casterData.itemInventory[usedItemInvEntryIndex].count == 1) {
        casterData.itemInventory.splice(usedItemInvEntryIndex, 1);
    } else {
        casterData.itemInventory[usedItemInvEntryIndex].count -= 1;
    }
}

itemFunctionMap.set('item_kick', (client, workingData, interaction, eventTokens) => {
    if (eventTokens.length <= 0) {
        //select target
        let row = new ActionRowBuilder()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_kick-" + "targetted")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Choose a target.")
            )

        interaction.update({
            content: underscore("Select a target for: Comically Large Boot"),
            components: [row],
            ephemeral: true
        });
    } else {
        //get caster data, caster member object, and caster stats/effects
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterMemberObj = interaction.member;
        let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

        //check if caster still has item
        let usedItemInvEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_kick";
        });

        if (usedItemInvEntryIndex < 0) {
            interaction.update(uiBuilders.notifDontHaveItem());
            return;
        }

        //get target member obj, target stats/effects, and target settings
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);
        let targetStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, targetMemberObj.user.id);
        let targetSettings = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.user.id;
        }).settings;

        //prevent self use
        if (targetMemberObj.user.id == casterData.id) {
            interaction.update(uiBuilders.notifCantSelfUse());
            return;
        }
        
        //prevent use on someone not in VC
        if (!targetMemberObj.voice.channelId) {
            interaction.update(uiBuilders.notifTargetNotInVC());
            return;
        }

        //consume item
        if (casterData.itemInventory[usedItemInvEntryIndex].count == 1) {
            casterData.itemInventory.splice(usedItemInvEntryIndex, 1);
        } else {
            casterData.itemInventory[usedItemInvEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${casterMemberObj.nickname ? `${casterMemberObj.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObj.nickname ? `${targetMemberObj.nickname}(${targetMemberObj.user.tag})` : targetMemberObj.user.tag}`;
        
        let targetPingSetting = targetSettings.find(obj => {
            return obj.name == "pingOnTargetted";
        });

        if (targetPingSetting.value) {
            targetString = userMention(targetMemberObj.user.id);
        };
        
        let sNotifMsg = `${casterString} has used a Comically Large Boot on ${targetString}.`;
        let cNotifMsg = "You've used a Comically Large Boot on " + userMention(interaction.values[0]) + ".";

        //handle target status effects
        let itemEffect = (target) => {
            if (target.voice.channelId) target.voice.disconnect();
        };
        let finalTargetMemberObj = targetMemberObj;

        targetStatsAndEffects.effects.forEach(effect => {
            switch (effect) {
                case "reflect":
                    finalTargetMemberObj = casterMemberObj;
                    sNotifMsg = `${casterString} has used a Comically Large Boot on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used a Comically Large Boot on " + userMention(interaction.values[0]) + " but it was reflected."
                    break;
            }
        });

        if (targetStatsAndEffects.stats.reflectChance) {
            finalTargetMemberObj = casterMemberObj;
            sNotifMsg = `${casterString} has used a Comically Large Boot on ${targetString} but it was reflected.`;
            cNotifMsg = "You've used a Comically Large Boot on " + userMention(interaction.values[0]) + " but it was reflected."
        }

        if (casterStatsAndEffects.stats.usableCrit) {
            itemEffect = (target) => {
                target.timeout(4 * 1000);
            };
            sNotifMsg += " The item crit!";
            cNotifMsg += " The item crit!";
        }

        //enact effects
        itemEffect(finalTargetMemberObj);

        //Send notification message to bot notifs channel
        interaction.member.guild.channels.cache.get(workingData[interaction.guildId].botNotifsChannelId).send({
            content: sNotifMsg
        });

        //update UI
        let row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
            );
        
        interaction.update({
            content: cNotifMsg,
            components: [row],
            ephemeral: true
        });
    }
});

itemFunctionMap.set('item_mute', (client, workingData, interaction, eventTokens) => {
    if (eventTokens.length <= 0) {
        //select target
        let row = new ActionRowBuilder()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_mute-" + "targetted")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Choose a target.")
            )

        interaction.update({
            content: underscore("Select a target for: Duct Tape"),
            components: [row],
            ephemeral: true
        });
    } else {
        //get caster data, caster member obj, and caster stats/effects
        let casterMemberObj = interaction.member;
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

        //get target data, target member obj, and target stats/effects
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);
        let targetData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.id;
        });
        let targetStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, targetMemberObj.id);
        let targetSettings = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.user.id;
        }).settings;

        //prevent self use
        if (targetMemberObj.user.id == interaction.user.id) {
            interaction.update(uiBuilders.notifCantSelfUse(interaction));
            return;
        }

        //prevent use on bot
        if (targetMemberObj.user.bot) {
            interaction.update(uiBuilders.notifCantUseOnBot());
            return;
        }

        //prevent use on someone not in VC
        if (!targetMemberObj.voice.channelId) {
            interaction.update(uiBuilders.notifTargetNotInVC());
            return;
        }

        //check if caster still has item
        let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_mute";
        });

        if (itemEntryIndex < 0) {
            interaction.update(uiBuilders.notifDontHaveItem());
            return;
        }

        //instantiate server/caster notification message
        let casterString = `${casterMemberObj.nickname ? `${casterMemberObj.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObj.nickname ? `${targetMemberObj.nickname}(${targetMemberObj.user.tag})` : targetMemberObj.user.tag}`;
        
        let targetPingSetting = targetSettings.find(obj => {
            return obj.name == "pingOnTargetted";
        });

        if (targetPingSetting.value) {
            targetString = userMention(targetMemberObj.user.id);
        };
        
        let sNotifMsg = `${casterString} has used Duct Tape on ${targetString}.`;
        let cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + ".";

        //handle target stats and effects
        let finalTargetMemberObj = targetMemberObj;
        let finalTargetData = targetData;
        let itemEffect = (targetMemObj, fTargetData) => {
            if (targetMemObj.voice.channelId) targetMemObj.voice.setMute(true);

            fTargetData.queuedForUnmute = false;

            let existingStatusEffect = fTargetData.statusEffects.find(obj => {
                return obj.name == "muted";
            });

            if (existingStatusEffect) {
                existingStatusEffect.expires = Math.floor(Date.now()/1000) + config.itemMuteDuration + (casterStatsAndEffects.stats.usableCrit * 4);
            } else {
                fTargetData.statusEffects.push(utils.getStatusEffectObject("muted", Math.floor(Date.now()/1000) + config.itemMuteDuration));
            }

            (async (mutedTarget) => {
                let timeoutDuration = config.itemMuteDuration + (casterStatsAndEffects.stats.usableCrit * 4);
                await setTimeout(() => {
                    if (mutedTarget.voice.channelId) {
                        mutedTarget.voice.setMute(false)
                    } else {
                        fTargetData.queuedForUnmute = true;
                    }
                }, timeoutDuration * 1000);
            })(targetMemObj)
        };

        targetStatsAndEffects.effects.forEach(effect => {
            switch (effect) {
                case "reflect":
                    finalTargetMemberObj = casterMemberObj;
                    finalTargetData = casterData;
                    sNotifMsg = `${casterString} has used Duct Tape on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + " but it was reflected."
                    break;
            }
        });

        if (targetStatsAndEffects.stats.reflectChance) {
            finalTargetMemberObj = casterMemberObj;
            finalTargetData = casterData;
            sNotifMsg = `${casterString} has used Duct Tape on ${targetString} but it was reflected.`;
            cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + " but it was reflected."
        }

        if (casterStatsAndEffects.stats.usableCrit) {
            sNotifMsg += " The item crit!";
            cNotifMsg += " The item crit!";
        }
        
        //enact item effect
        itemEffect(finalTargetMemberObj, finalTargetData);

        //consume item
        if (casterData.itemInventory[itemEntryIndex].count == 1) {
            casterData.itemInventory.splice(itemEntryIndex, 1);
        } else {
            casterData.itemInventory[itemEntryIndex].count -= 1;
        }

        //send msg to notifs channel
        interaction.guild.channels.cache.get(workingData[interaction.guildId].botNotifsChannelId).send({
            content: sNotifMsg
        });

        //update UI
        let row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
            );
        
        interaction.update({
            content: cNotifMsg,
            components: [row],
            ephemeral: true
        });
    }
});

itemFunctionMap.set('item_steal', (client, workingData, interaction, eventTokens) => {
    if (eventTokens.length <= 0) {
        //select target
        let row = new ActionRowBuilder()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_steal-" + "targetted")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Choose a target.")
            )

        interaction.update({
            content: underscore("Select a target for: Goose with a Knife"),
            components: [row],
            ephemeral: true
        });
    } else {
        //get caster data and stats/effects
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

        //get target data and stats/effects
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);
        let targetData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.values[0];
        });
        let targetStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);
        let targetSettings = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.user.id;
        }).settings;

        //prevent self use
        if (targetMemberObj.user.id == interaction.user.id) {
            interaction.update(uiBuilders.notifCantSelfUse());
            return;
        }

        //prevent use on bot
        if (targetMemberObj.user.bot) {
            interaction.update(uiBuilders.notifCantUseOnBot());
            return;
        }

        //check if caster still has item
        let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_steal";
        });

        if (itemEntryIndex < 0) {
            interaction.update(uiBuilders.notifDontHaveItem());
            return;
        }

        //consume item
        if (casterData.itemInventory[itemEntryIndex].count == 1) {
            casterData.itemInventory.splice(itemEntryIndex, 1);
        } else {
            casterData.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let finalTargetData = targetData;
        let finalCasterData = casterData;
        let itemEffect = (fTargetData, fCasterData, oCasterStatsAndEffects, invSlot) => {
            let stolenItemObj = fTargetData.itemInventory[invSlot];

            if (fTargetData.itemInventory.length > 0) {
                if (fTargetData.itemInventory[invSlot].count > 1) {
                    fTargetData.itemInventory[invSlot].count -= 1;
                } else {
                    fTargetData.itemInventory.slice(invSlot, 1);
                }

                let existingItemEntry = fCasterData.itemInventory.find(obj => {
                    return obj.name == stolenItemObj.name;
                });

                if (existingItemEntry) {
                    existingItemEntry.count += 1;
                } else {
                    let newItemEntry = {...stolenItemObj};
                    newItemEntry.count = 1;
                    fCasterData.itemInventory.push(newItemEntry);
                }

                if (oCasterStatsAndEffects.stats.usableCrit) {
                    fTargetData.balance -= 2;
                    fCasterData.balance += 2;
                }
            } else {
                if (oCasterStatsAndEffects.stats.usableCrit) {
                    fTargetData.balance -= 2;
                    fCasterData.balance += 2;
                }

                fCasterData.balance += 3;
            }
        };

        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObject.nickname ? `${targetMemberObject.nickname}(${targetMemberObject.user.tag})` : targetMemberObject.user.tag}`;
        
        let targetPingSetting = targetSettings.find(obj => {
            return obj.name == "pingOnTargetted";
        });

        if (targetPingSetting.value) {
            targetString = userMention(targetMemberObj.user.id);
        };
        
        let sNotifMsg = "";
        let cNotifMsg = "";

        let reflected = false;

        //handle passed modifiers
        targetStatsAndEffects.effects.forEach(effect => {
            switch (effect) {
                case "reflect":
                    reflected = true;
                    finalTargetData = casterData;
                    finalCasterData = targetData;
                    break;
            }
        });

        if (targetStatsAndEffects.stats.reflectChance) {
            reflected = true;
            finalTargetData = casterData;
            finalCasterData = targetData;
        }
        
        //enact item effect
        let targettedInv = finalTargetData.itemInventory;
        let randomInvSlot = Math.round(Math.random() * (targettedInv.length - 1));

        let randomStealList = [
            "kidney", "liver", "leg", "wallet", "pokemon card collection", "V-bucks", "toes"
        ];

        //construct sNotifMsg and cNotifMsg
        if (targettedInv.length > 0 && !reflected) {
            //item inventory NOT empty AND item NOT reflected
            let stolenItem = targettedInv[randomInvSlot];

            cNotifMsg = "You've used a Goose with a Knife on " + userMention(interaction.values[0]) + " and stole 1x " + stolenItem.displayName + ".";
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString}.`;
        } else if (targettedInv.length > 0 && reflected) {
            //item inventory NOT empty and item IS reflected
            let stolenItem = targettedInv[randomInvSlot];

            cNotifMsg = "You've used a Goose with a Knife on " + userMention(interaction.values[0]) + " but it was reflected (paid off). Now you're missing 1x " + stolenItem.displayName + ".";
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but it was reflected (paid off).`;

        } else if (targettedInv.length <= 0 && !reflected) {
            //item inventory IS empty and item is NOT reflected
            let randomStolenItem = randomStealList[Math.round(Math.random() * (randomStealList.length - 1))];

            cNotifMsg = `You've used a Goose with a Knife on ${userMention(interaction.values[0])} but there was nothing to steal so it just took his ${randomStolenItem} and sold it on the black market. He gave you a 3 Edbuck cut.`;
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but there was nothing to steal so it took his ${randomStolenItem} and sold it on the black market.`;
        } else {
            //item inventory IS empty and item IS reflected
            let randomStolenItem = randomStealList[Math.round(Math.random() * (randomStealList.length - 1))];

            cNotifMsg = `You've used a Goose with a Knife on ${userMention(interaction.values[0])} but it was reflected. There was nothing to steal so it just took your ${randomStolenItem} and sold it on the black market. It gave him a 3 Edbuck cut.`;
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but it was reflected. There was nothing to steal so it just took his ${randomStolenItem} and sold it on the black market.`;
        }

        if (casterStatsAndEffects.stats.usableCrit) {
            cNotifMsg += " The item crit and the goose stole 2 edbucks too!";
            sNotifMsg += " The item crit and the goose stole 2 edbucks too!";
        }

        itemEffect(finalTargetData, finalCasterData, casterStatsAndEffects, randomInvSlot)

        //send msg to notifs channel
        interaction.member.guild.channels.cache.get(workingData[interaction.guildId].botNotifsChannelId).send({
            content: sNotifMsg
        });

        //update UI
        let row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
            );
        
        interaction.update({
            content: cNotifMsg,
            components: [row],
            ephemeral: true
        });
    }
});

itemFunctionMap.set('item_polymorph', (client, workingData, interaction, eventTokens) => {
    let nextToken = eventTokens.shift();
    if (!nextToken) {
        //select polymorph target
        let row = new ActionRowBuilder()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_polymorph-" + "targetted")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Choose a target.")
            )

        interaction.update({
            content: underscore("Select a target for: Semi-permanent Nametag"),
            components: [row],
            ephemeral: true
        });

    } else if (nextToken == "targetted") {
        //input polymorph name
        let modal = new ModalBuilder()
            .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_polymorph-" + interaction.values[0])
            .setTitle("Semi-permanent Nametag")
            .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("newNickname")
                    .setStyle(TextInputStyle.Short)
                    .setLabel("New Nickname")
            )
        )

        interaction.showModal(modal);
    } else {
        //get caster data and caster stats/effects
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);
        let casterMemberObj = interaction.member;

        //get target member obj, data, and stats/effects
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(nextToken);
        let targetData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.user.id;
        });
        let targetStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, targetMemberObj.user.id);
        let targetSettings = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.user.id;
        }).settings;

        //get target and new nickname
        let newNickname = interaction.fields.getTextInputValue('newNickname');

        //prevent self use
        if (targetMemberObj.user.id == casterMemberObj.user.id) {
            interaction.update(uiBuilders.notifCantSelfUse());
            return;
        }

        //check if caster still has item
        let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_polymorph";
        });

        if (itemEntryIndex < 0) {
            interaction.update(uiBuilders.notifDontHaveItem());
            return;
        }

        //consume item
        if (casterData.itemInventory[itemEntryIndex].count == 1) {
            casterData.itemInventory.splice(itemEntryIndex, 1);
        } else {
            casterData.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObj.nickname ? `${targetMemberObj.nickname}(${targetMemberObj.user.tag})` : targetMemberObj.user.tag}`;

        let targetPingSetting = targetSettings.find(obj => {
            return obj.name == "pingOnTargetted";
        });

        if (targetPingSetting.value) {
            targetString = userMention(targetMemberObj.user.id);
        };

        let sNotifMsg = `${casterString} has used a Semi-permanent Nametag with [${newNickname}] written on it on ${targetString}.`;
        let cNotifMsg = "You've used Semi-permanent Nametag on " + userMention(nextToken) + ".";

        //handle passed modifiers
        let reflected = false;
        targetStatsAndEffects.effects.forEach(effect => {
            switch (effect) {
                case "reflect":
                    reflected = true;
                    sNotifMsg = `${casterString} has used Semi-permanent Nametag with [${newNickname}] written on it on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used Semi-permanent Nametag on " + userMention(nextToken) + " but it was reflected."
                    break;
            }
        });

        if (targetStatsAndEffects.stats.reflectChance) {
            reflected = true;
            sNotifMsg = `${casterString} has used Semi-permanent Nametag with [${newNickname}] written on it on ${targetString} but it was reflected.`;
            cNotifMsg = "You've used Semi-permanent Nametag on " + userMention(nextToken) + " but it was reflected.";
        };

        if (casterStatsAndEffects.stats.usableCrit) {
            sNotifMsg += " The item crit!";
            cNotifMsg += " The item crit!";
        }

        //apply item effect
        //apply polymorph status effect
        let existingStatusEffect = (reflected ? casterData : targetData).statusEffects.find(obj => {
            return obj.name == "polymorph";
        });

        if (existingStatusEffect) {
            existingStatusEffect.expires = Math.floor(Date.now()/1000) + config.itemPolymorphDuration + (casterStatsAndEffects.stats.usableCrit * 240);
            existingStatusEffect.polyName = newNickname;
        } else {
            targetData.statusEffects.push(utils.getStatusEffectObject("polymorph", Math.floor(Date.now()/1000) + config.itemPolymorphDuration + (casterStatsAndEffects.stats.usableCrit * 240), {polyName: newNickname}));
        }

        //enact item effects
        (reflected ? casterMemberObj : targetMemberObj).setNickname(newNickname);

        //send msg to notifs channel
        interaction.member.guild.channels.cache.get(workingData[interaction.guildId].botNotifsChannelId).send({
            content: sNotifMsg
        });

        //update UI
        let row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
            );
        
        interaction.update({
            content: cNotifMsg,
            components: [row],
            ephemeral: true
        });
    }
});

itemFunctionMap.set('item_reflect', (client, workingData, interaction, eventTokens) => {
    //check if caster still has item
    let casterData = workingData[interaction.guildId].users.find(obj => {
        return obj.id == interaction.user.id;
    });

    let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
        return obj.name == "item_reflect";
    });

    if (itemEntryIndex < 0) {
        interaction.update(uiBuilders.notifDontHaveItem(interaction));
        return;
    }

    //apply reflect status effect
    let existingStatusEffect = casterData.statusEffects.find(obj => {
        return obj.name == "reflect";
    });

    if (existingStatusEffect) {
        existingStatusEffect.expires = Math.floor(Date.now()/1000) + config.itemReflectDuration;
    } else {
        casterData.statusEffects.push(utils.getStatusEffectObject("reflect", Math.floor(Date.now()/1000) + config.itemReflectDuration));
    }

    //consume item
    if (casterData.itemInventory[itemEntryIndex].count == 1) {
        casterData.itemInventory.splice(itemEntryIndex, 1);
    } else {
        casterData.itemInventory[itemEntryIndex].count -= 1;
    }

    //update UI
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
        );
    
    interaction.update({
        content: "You've used a \"no u\".",
        components: [row],
        ephemeral: true
    });
});

itemFunctionMap.set('item_expose', (client, workingData, interaction, eventTokens) => {
    if (eventTokens.length <= 0) {
        //select target
        let row = new ActionRowBuilder()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_expose-" + "targetted")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Choose a target.")
            )

        interaction.update({
            content: underscore("Select a target for: 4K HD Wide-angle Lens Camera"),
            components: [row],
            ephemeral: true
        });
    } else {
        //get caster data
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

        //get target data, member obj, and stats/effects
        let targetData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.values[0];
        });
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);
        let targetStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, targetMemberObj.user.id);
        let targetSettings = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.user.id;
        }).settings;

        //check if caster still has item
        let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_expose";
        });

        if (itemEntryIndex < 0) {
            interaction.update(uiBuilders.notifDontHaveItem());
            return;
        }

        //prevent use on bot
        if (targetMemberObj.user.bot) {
            interaction.update(uiBuilders.notifCantUseOnBot());
            return;
        }

        //consume item
        if (casterData.itemInventory[itemEntryIndex].count == 1) {
            casterData.itemInventory.splice(itemEntryIndex, 1);
        } else {
            casterData.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObj.nickname ? `${targetMemberObj.nickname}(${targetMemberObj.user.tag})` : targetMemberObj.user.tag}`;
        
        let targetPingSetting = targetSettings.find(obj => {
            return obj.name == "pingOnTargetted";
        });

        if (targetPingSetting.value) {
            targetString = userMention(targetMemberObj.user.id);
        };
        
        let sNotifMsg = `${casterString} has used 4K HD Wide-angle Lens Camera on ${targetString}.`;
        let cNotifMsg = "You've used 4K HD Wide-angle Lens Camera on " + userMention(interaction.values[0]) + ".";

        //handle passed modifiers
        let reflected = false;
        targetStatsAndEffects.effects.forEach(effect => {
            switch (effect) {
                case "reflect":
                    reflected = true;
                    sNotifMsg = `${casterString} has used 4K HD Wide-angle Lens Camera on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used 4K HD Wide-angle Lens Camera on " + userMention(interaction.values[0]) + " but it was reflected.";
                    break;
            }
        });

        if (targetStatsAndEffects.stats.reflectChance) {
            reflected = true;
            sNotifMsg = `${casterString} has used 4K HD Wide-angle Lens Camera on ${targetString} but it was reflected.`;
            cNotifMsg = "You've used 4K HD Wide-angle Lens Camera on " + userMention(interaction.values[0]) + " but it was reflected.";
        }

        let exposedMsg = (reflected ? casterData : targetData).lastChangedMsg;
        let embed;

        if (Object.keys(exposedMsg).length > 0) {
            embed = new EmbedBuilder()
                .setAuthor({name: reflected ? casterString : targetString, iconURL: reflected ? interaction.member.avatarURL() : targetMemberObj.avatarURL()})
                .setTitle("Time Sent")
                .setDescription(time(exposedMsg.time,"F"))
        
            if (exposedMsg.newContent) {
                embed.setFields(
                    {name: "Old Message", value: exposedMsg.oldContent},
                    {name: "New Message", value: exposedMsg.newContent}
                )
            } else {
                embed.setFields(
                    {name: "Deleted Message", value: exposedMsg.oldContent}
                )
            }
        } else {
            embed = new EmbedBuilder()
                .setAuthor({name: reflected ? casterString : targetString, iconURL: reflected ? interaction.member.avatarURL() : targetMemberObj.avatarURL()})
                .setTitle("Modified Message")
                .setDescription("No Message To Expose")
                .setFields({
                    name: "No Message To Expose", value: "No Message To Expose"
                })
        }

        client.guilds.cache.get(interaction.guildId).channels.cache.get(Object.keys(exposedMsg).length > 0 ? exposedMsg.channel : workingData[interaction.guildId].botNotifsChannelId).send({
            embeds: [embed]
        });

        //send msg to notifs channel
        interaction.member.guild.channels.cache.get(workingData[interaction.guildId].botNotifsChannelId).send({
            content: sNotifMsg
        });

        //update UI
        let row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
            );
        
        interaction.update({
            content: cNotifMsg,
            components: [row],
            ephemeral: true
        });
    }
});

itemFunctionMap.set('item_edwindinner', (client, workingData, interaction, eventTokens) => {
    if (eventTokens.length <= 0) {
        //select target
        let row = new ActionRowBuilder()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_edwindinner-" + "targetted")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Choose a target.")
            )

        interaction.update({
            content: underscore("Select a target for: Edwin Dinner™"),
            components: [row],
            ephemeral: true
        });
    } else {
        //get caster data
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterMemberObj = interaction.member;
        let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

        //get target data
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);
        let targetStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, targetMemberObj.user.id);
        let targetSettings = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.user.id;
        }).settings;

        //prevent use on bot
        if (targetMemberObj.user.bot) {
            interaction.update(uiBuilders.notifCantUseOnBot());
            return;
        }

        //prevent self use
        if (targetMemberObj.user.id == interaction.user.id) {
            interaction.update(uiBuilders.notifCantSelfUse());
            return;
        }

        //check if caster still has item
        let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_edwindinner";
        });

        if (itemEntryIndex < 0) {
            interaction.update(uiBuilders.notifDontHaveItem());
            return;
        }

        //consume item
        if (casterData.itemInventory[itemEntryIndex].count == 1) {
            casterData.itemInventory.splice(itemEntryIndex, 1);
        } else {
            casterData.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObj.nickname ? `${targetMemberObj.nickname}(${targetMemberObj.user.tag})` : targetMemberObj.user.tag}`;
        
        let targetPingSetting = targetSettings.find(obj => {
            return obj.name == "pingOnTargetted";
        });

        if (targetPingSetting.value) {
            targetString = userMention(targetMemberObj.user.id);
        };
        
        let sNotifMsg = `${casterString} has used Edwin Dinner™ on ${targetString}.`;
        let cNotifMsg = "You've used Edwin Dinner™ on " + userMention(interaction.values[0]) + ".";

        //handle passed modifiers
        let reflected = false;
        targetStatsAndEffects.effects.forEach(effect => {
            switch (effect) {
                case "reflect":
                    sNotifMsg = `${casterString} has used Edwin Dinner™ on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used Edwin Dinner™ on " + userMention(interaction.values[0]) + " but it was reflected.";
                    reflected = true;
                    break;
            }
        });

        //append crit notif if item crit.
        if (casterStatsAndEffects.stats.usableCrit) {
            cNotifMsg += " The item crit!";
            sNotifMsg += " The item crit!";
        }
        
        //enact item effect
        (reflected ? casterMemberObj : targetMemberObj).timeout((config.itemTimeoutDuration * 1000) + (casterStatsAndEffects.stats.usableCrit * 4000));

        //send msg to notifs channel
        interaction.member.guild.channels.cache.get(workingData[interaction.guildId].botNotifsChannelId).send({
            content: sNotifMsg
        });

        //update UI
        let row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
            );
        
        interaction.update({
            content: cNotifMsg,
            components: [row],
            ephemeral: true
        });
    }
});

itemFunctionMap.set('item_emp', (client, workingData, interaction, eventTokens) => {
    if (eventTokens.length <= 0) {
        //select target
        let row = new ActionRowBuilder()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "USE-" + "item_emp-" + "targetted")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setPlaceholder("Choose a target.")
                    .setChannelTypes([ChannelType.GuildVoice])
            )

        interaction.update({
            content: underscore("Select a target for: 150 Tech-savy Apes"),
            components: [row],
            ephemeral: true
        });
    } else {
        //get caster data and stats/effects
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterStatsAndEffects = utils.checkStatsAndEffects(workingData, interaction, interaction.user.id);

        //get targetted channel
        let targetChannel = interaction.channels.get(interaction.values[0]);

        let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_emp";
        });

        if (itemEntryIndex < 0) {
            interaction.update(uiBuilders.notifDontHaveItem(interaction));
            return;
        }

        //consume item
        if (casterData.itemInventory[itemEntryIndex].count == 1) {
            casterData.itemInventory.splice(itemEntryIndex, 1);
        } else {
            casterData.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetChannel.name}`;
        let sNotifMsg = `${casterString} has used 150 Tech-savy Apes on voice channel: ${targetString}.`;
        let cNotifMsg = "You've used Tech-savy Apes on the voice channel: " + targetString + ".";
        
        //append crit notif if item crit.
        if (casterStatsAndEffects.stats.usableCrit) {
            cNotifMsg += " The item crit!";
            sNotifMsg += " The item crit!";
        }

        //enact item effect
        targetChannel.setBitrate(8000);

        (async (targetChannel) => {
            let timeoutDuration = config.itemEMPDuration + (casterStatsAndEffects.stats.usableCrit * 8);
            await setTimeout(() => {
                targetChannel.setBitrate(64000);
            }, timeoutDuration * 1000);
        })(targetChannel)

        //send msg to notifs channel
        interaction.member.guild.channels.cache.get(workingData[interaction.guildId].botNotifsChannelId).send({
            content: sNotifMsg
        });

        //update UI
        let row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(intEventTokens.playerUsablesInvInfoPrefix + "BACK")
            );
        
        interaction.update({
            content: cNotifMsg,
            components: [row],
            ephemeral: true
        });
    }
});

module.exports = { usableItemsFunctionalities };