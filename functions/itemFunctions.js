const { ButtonStyle, time, ActionRowBuilder, ButtonBuilder, underscore, EmbedBuilder, TextInputBuilder, TextInputStyle, MentionableSelectMenuBuilder, userMention, ModalBuilder, UserSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const intEventTokens = require('../constants/intEventTokens.js');
const config = require('../constants/configConsts.js');

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
        //get caster data and member object
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });
        let casterMemberObj = interaction.member;

        //check if caster still has item
        let usedItemInvEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_kick";
        });

        if (usedItemInvEntryIndex < 0) {
            notifDontHaveItem(interaction);
            return;
        }

        //get target data
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

        //prevent self use
        if (targetMemberObj.user.id == casterData.id) {
            notifCantSelfUse(interaction);
            return;
        }

        //prevent use on someone not in VC
        if (!targetMemberObj.voice.channelId) {
            notifTargetNotInVC(interaction);
            return;
        }

        //do stats and effects check
        let passedModifiers = checkStatsAndEffects(interaction, targetMemberObj.user.id);

        //consume item
        if (casterData.itemInventory[usedItemInvEntryIndex].count == 1) {
            casterData.itemInventory.splice(usedItemInvEntryIndex, 1);
        } else {
            casterData.itemInventory[usedItemInvEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${casterMemberObj.nickname ? `${casterMemberObj.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObj.nickname ? `${targetMemberObj.nickname}(${targetMemberObj.user.tag})` : targetMemberObj.user.tag}`;
        let sNotifMsg = `${casterString} has used a Comically Large Boot on ${targetString}.`;
        let cNotifMsg = "You've used a Comically Large Boot on " + userMention(interaction.values[0]) + ".";

        //handle passed modifiers
        passedModifiers.forEach(effect => {
            switch (effect) {
                case "reflect":
                    target = casterMemberObj;
                    sNotifMsg = `${casterString} has used a Comically Large Boot on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used a Comically Large Boot on " + userMention(interaction.values[0]) + " but it was reflected."
                    break;
            }
        });

        //ennact item effect
        targetMemberObj.voice.disconnect();

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
        //get caster data and member obj
        let casterMemberObj = interaction.member;
        let casterData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });

        //get target data and member obj
        let targetMemberObj = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);
        let targetData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberObj.id;
        });

        //prevent self use
        if (targetMemberObj.user.id == interaction.user.id) {
            notifCantSelfUse(interaction);
            return;
        }

        //prevent use on someone not in VC
        if (!targetMemberObj.voice.channelId) {
            notifTargetNotInVC(interaction);
            return;
        }

        //check if caster still has item
        let itemEntryIndex = casterData.itemInventory.findIndex(obj => {
            return obj.name == "item_mute";
        });

        if (itemEntryIndex < 0) {
            notifDontHaveItem(interaction);
            return;
        }

        //do stats and effects check
        let passedModifiers = checkStatsAndEffects(interaction, targetMemberObj.id);
        let reflected = false;

        //instantiate server/caster notification message
        let casterString = `${casterMemberObj.nickname ? `${casterMemberObj.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObj.nickname ? `${targetMemberObj.nickname}(${targetMemberObj.user.tag})` : targetMemberObj.user.tag}`;
        let sNotifMsg = `${casterString} has used Duct Tape on ${targetString}.`;
        let cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + ".";

        //handle passed modifiers
        passedModifiers.forEach(effect => {
            switch (effect) {
                case "reflect":
                    targetMemberObj = casterMemberObj;
                    sNotifMsg = `${casterString} has used Duct Tape on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + " but it was reflected."
                    reflected = true;
                    break;
            }
        });
        
        //enact item effect if possible
        if (targetMemberObj.voice.channelId) {
            targetMemberObj.voice.setMute(true);
        }

        //consume item
        if (casterData.itemInventory[itemEntryIndex].count == 1) {
            casterData.itemInventory.splice(itemEntryIndex, 1);
        } else {
            casterData.itemInventory[itemEntryIndex].count -= 1;
        }
        
        //apply muted status effect
        let existingStatusEffect;
        if (reflected) {
            casterData.queuedForUnmute = false;
            existingStatusEffect = casterData.statusEffects.find(obj => {
                return obj.name == "muted";
            });
        } else {
            targetData.queuedForUnmute = false;
            existingStatusEffect = targetData.statusEffects.find(obj => {
                return obj.name == "muted";
            });
        }

        if (existingStatusEffect) {
            existingStatusEffect.expires = Math.floor(Date.now()/1000) + config.itemMuteDuration;
        } else if (reflected) {
            casterData.statusEffects.push(getStatusEffectObject("muted", Math.floor(Date.now()/1000) + config.itemMuteDuration));
        } else {
            targetData.statusEffects.push(getStatusEffectObject("muted", Math.floor(Date.now()/1000) + config.itemMuteDuration));
        }

        (async (mutedTarget) => {
            let timeoutDuration = config.itemMuteDuration;
            await setTimeout(() => {
                if (mutedTarget.voice.channelId) {
                    mutedTarget.voice.setMute(false)
                } else {
                    if (reflected) {
                        casterData.queuedForUnmute = true;
                    } else {
                        targetData.queuedForUnmute = true;
                    }
                }
            }, timeoutDuration * 1000);
        })(targetMemberObj)

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
        //get target data
        let targetMemberObject = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

        //prevent self use
        if (targetMemberObject.user.id == interaction.user.id) {
            notifCantSelfUse(interaction);
            return;
        }

        //check if caster still has item
        let caster = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });

        let itemEntryIndex = caster.itemInventory.findIndex(obj => {
            return obj.name == "item_steal";
        });

        if (itemEntryIndex < 0) {
            notifDontHaveItem(interaction);
            return;
        }

        //do stats and effects check
        let passedModifiers = checkStatsAndEffects(interaction, targetMemberObject.user.id);

        //consume item
        if (caster.itemInventory[itemEntryIndex].count == 1) {
            caster.itemInventory.splice(itemEntryIndex, 1);
        } else {
            caster.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let reflected = false;
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberObject.nickname ? `${targetMemberObject.nickname}(${targetMemberObject.user.tag})` : targetMemberObject.user.tag}`;
        let sNotifMsg = "";
        let cNotifMsg = "";

        //handle passed modifiers
        passedModifiers.forEach(effect => {
            switch (effect) {
                case "reflect":
                    reflected = true;
                    break;
            }
        });
        
        //enact item effect
        let randomInvSlot;
        let targettedData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == (reflected ? interaction.user.id : targetMemberObject.user.id);
        });
        let targettedInv = targettedData.itemInventory;

        let randomStealList = [
            "kidney", "liver", "leg", "wallet", "pokemon card collection", "V-bucks", "toes"
        ];

        if (targettedInv.length > 0 && !reflected) {
            //item inventory NOT empty AND item NOT reflected
            randomInvSlot = Math.round(Math.random() * (targettedInv.length - 1));
            let stolenItem = targettedInv[randomInvSlot];
            if (targettedInv[randomInvSlot].count > 1) {
                targettedInv[randomInvSlot].count -= 1;
            } else {
                targettedInv.slice(randomInvSlot, 1);
            }

            let existingItemEntry = caster.itemInventory.find(obj => {
                return obj.name == stolenItem.name;
            });

            if (existingItemEntry) {
                existingItemEntry.count += 1;
            } else {
                let newItemEntry = {...stolenItem};
                newItemEntry.count = 1;
                caster.itemInventory.push(newItemEntry);
            }

            cNotifMsg = "You've used a Goose with a Knife on " + userMention(interaction.values[0]) + " and stole 1x " + stolenItem.displayName + ".";
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString}.`;
        } else if (targettedInv.length > 0 && reflected) {
            //item inventory NOT empty and item IS reflected
            randomInvSlot = Math.round(Math.random() * (targettedInv.length - 1));
            let stolenItem = targettedInv[randomInvSlot];
            if (targettedInv[randomInvSlot].count > 1) {
                targettedInv[randomInvSlot].count -= 1;
            } else {
                targettedInv.slice(randomInvSlot, 1);
            }

            let targetWorkingDataObj = workingData[interaction.guildId].users.find(obj => {
                return obj.id == targetMemberObject.user.id;
            });

            let existingItemEntry = targetWorkingDataObj.itemInventory.find(obj => {
                return obj.name == stolenItem.name;
            });

            if (existingItemEntry) {
                existingItemEntry.count += 1;
            } else {
                let newItemEntry = {...stolenItem};
                newItemEntry.count = 1;
                targetWorkingDataObj.itemInventory.push(newItemEntry);
            }

            cNotifMsg = "You've used a Goose with a Knife on " + userMention(interaction.values[0]) + " but it was reflected (paid off). Now you're missing 1x " + stolenItem.displayName + ".";
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but it was reflected (paid off).`;

        } else if (targettedInv.length <= 0 && !reflected) {
            //item inventory IS empty and item is NOT reflected
            let randomStolenItem = randomStealList[Math.round(Math.random() * (randomStealList.length - 1))];

            caster.balance += 3;

            cNotifMsg = `You've used a Goose with a Knife on ${userMention(interaction.values[0])} but there was nothing to steal so it just took his ${randomStolenItem} and sold it on the black market. He gave you a 3 Edbuck cut.`;
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but there was nothing to steal so it took his ${randomStolenItem} and sold it on the black market.`;
        } else {
            //item inventory IS empty and item IS reflected
            let randomStolenItem = randomStealList[Math.round(Math.random() * (randomStealList.length - 1))];

            targettedData.balance += 3;

            cNotifMsg = `You've used a Goose with a Knife on ${userMention(interaction.values[0])} but it was reflected. There was nothing to steal so it just took your ${randomStolenItem} and sold it on the black market. It gave him a 3 Edbuck cut.`;
            sNotifMsg = `${casterString} has used Goose with a Knife on ${targetString} but it was reflected. There was nothing to steal so it just took his ${randomStolenItem} and sold it on the black market.`;
        }

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
                //get target and new nickname
                let newNickname = interaction.fields.getTextInputValue('newNickname');
                let target = client.guilds.cache.get(interaction.guildId).members.cache.get(nextToken);

                //prevent self use
                if (target.user.id == interaction.user.id) {
                    notifCantSelfUse(interaction);
                    return;
                }

                //check if caster still has item
                let caster = workingData[interaction.guildId].users.find(obj => {
                    return obj.id == interaction.user.id;
                });

                let itemEntryIndex = caster.itemInventory.findIndex(obj => {
                    return obj.name == "item_polymorph";
                });

                if (itemEntryIndex < 0) {
                    notifDontHaveItem(interaction);
                    return;
                }

                //do stats and effects check
                let passedModifiers = checkStatsAndEffects(interaction, target.user.id);

                //consume item
                if (caster.itemInventory[itemEntryIndex].count == 1) {
                    caster.itemInventory.splice(itemEntryIndex, 1);
                } else {
                    caster.itemInventory[itemEntryIndex].count -= 1;
                }

                //instantiate server/caster notification message
                let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
                let targetString = `${target.nickname ? `${target.nickname}(${target.user.tag})` : target.user.tag}`;
                let sNotifMsg = `${casterString} has used Semi-permanent Nametag on ${targetString}.`;
                let cNotifMsg = "You've used Semi-permanent Nametag on " + userMention(nextToken) + ".";

                //handle passed modifiers
                passedModifiers.forEach(effect => {
                    switch (effect) {
                        case "reflect":
                            target = interaction.member;
                            sNotifMsg = `${casterString} has used Semi-permanent Nametag on ${targetString} but it was reflected.`;
                            cNotifMsg = "You've used Semi-permanent Nametag on " + userMention(nextToken) + " but it was reflected."
                            break;
                    }
                });
                
                //apply polymorph status effect
                let targetData = workingData[interaction.guildId].users.find(obj => {
                    return obj.id == target.user.id;
                });

                let existingStatusEffect = targetData.statusEffects.find(obj => {
                    return obj.name == "polymorph";
                });

                if (existingStatusEffect) {
                    existingStatusEffect.expires = Math.floor(Date.now()/1000) + config.itemPolymorphDuration;
                    existingStatusEffect.polyName = newNickname;
                } else {
                    targetData.statusEffects.push(getStatusEffectObject("polymorph", Math.floor(Date.now()/1000) + config.itemPolymorphDuration, {polyName: newNickname}));
                }

                //enact item effects
                target.setNickname(newNickname);

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

    let itemEntryIndex = caster.itemInventory.findIndex(obj => {
        return obj.name == "item_reflect";
    });

    if (itemEntryIndex < 0) {
        notifDontHaveItem(interaction);
        return;
    }

    //apply reflect status effect
    let existingStatusEffect = casterData.statusEffects.find(obj => {
        return obj.name == "reflect";
    });

    if (existingStatusEffect) {
        existingStatusEffect.expires = Math.floor(Date.now()/1000) + config.itemReflectDuration;
    } else {
        casterData.statusEffects.push(getStatusEffectObject("reflect", Math.floor(Date.now()/1000) + config.itemReflectDuration));
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
        //check if caster still has item
        let caster = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });

        let itemEntryIndex = caster.itemInventory.findIndex(obj => {
            return obj.name == "item_expose";
        });

        if (itemEntryIndex < 0) {
            notifDontHaveItem(interaction);
            return;
        }

        //get target data
        let targetMemberData = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

        let targetData = workingData[interaction.guildId].users.find(obj => {
            return obj.id == targetMemberData.user.id;
        })

        //consume item
        if (caster.itemInventory[itemEntryIndex].count == 1) {
            caster.itemInventory.splice(itemEntryIndex, 1);
        } else {
            caster.itemInventory[itemEntryIndex].count -= 1;
        }

        let passedModifiers = checkStatsAndEffects(interaction, targetData.id);

        //instantiate server/caster notification message
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${targetMemberData.nickname ? `${targetMemberData.nickname}(${targetMemberData.user.tag})` : targetMemberData.user.tag}`;
        let sNotifMsg = `${casterString} has used 4K HD Wide-angle Lens Camera on ${targetString}.`;
        let cNotifMsg = "You've used 4K HD Wide-angle Lens Camera on " + userMention(interaction.values[0]) + ".";
        let reflected = false;

        //handle passed modifiers
        passedModifiers.forEach(effect => {
            switch (effect) {
                case "reflect":
                    targetData = caster;
                    sNotifMsg = `${casterString} has used Duct Tape on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used Duct Tape on " + userMention(interaction.values[0]) + " but it was reflected."
                    reflected = true;
                    break;
            }
        });

        let exposedMsg = targetData.lastChangedMsg;
        let embed;

        if (exposedMsg) {
            embed = new EmbedBuilder()
                .setAuthor({name: reflected ? casterString : targetString, iconURL: reflected ? interaction.member.avatarURL() : targetMemberData.avatarURL()})
                .setTitle("Time Sent")
                .setDescription(time(exposedMsg.time,"F"))
        
            if (exposedMsg.newContent) {
                embed.addFields(
                    {name: "Old Message", value: exposedMsg.oldContent},
                    {name: "New Message", value: exposedMsg.newContent}
                )
            } else {
                embed.addFields(
                    {name: "Deleted Message", value: exposedMsg.oldContent}
                )
            }
        } else {
            embed = new EmbedBuilder()
                .setAuthor(reflected ? casterString : targetString)
                .setTitle("Modified Message")
                .setDescription("No Message To Expose")
                .addFields({
                    name: "No Message To Expose"
                })
        }

        client.guilds.cache.get(interaction.guildId).channels.cache.get(exposedMsg.channel).send({
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
                new MentionableSelectMenuBuilder()
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
        //get target data
        let target = client.guilds.cache.get(interaction.guildId).members.cache.get(interaction.values[0]);

        //prevent self use
        if (target.user.id == interaction.user.id) {
            notifCantSelfUse(interaction);
            return;
        }

        //check if caster still has item
        let caster = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });

        let itemEntryIndex = caster.itemInventory.findIndex(obj => {
            return obj.name == "item_edwindinner";
        });

        if (itemEntryIndex < 0) {
            notifDontHaveItem(interaction);
            return;
        }

        //do stats and effects check
        let passedModifiers = checkStatsAndEffects(interaction, target.user.id);

        //consume item
        if (caster.itemInventory[itemEntryIndex].count == 1) {
            caster.itemInventory.splice(itemEntryIndex, 1);
        } else {
            caster.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${target.nickname ? `${target.nickname}(${target.user.tag})` : target.user.tag}`;
        let sNotifMsg = `${casterString} has used Edwin Dinner™ on ${targetString}.`;
        let cNotifMsg = "You've used Edwin Dinner™ on " + userMention(interaction.values[0]) + ".";

        //handle passed modifiers
        passedModifiers.forEach(effect => {
            switch (effect) {
                case "reflect":
                    target = interaction.member;
                    sNotifMsg = `${casterString} has used Edwin Dinner™ on ${targetString} but it was reflected.`;
                    cNotifMsg = "You've used Edwin Dinner™ on " + userMention(interaction.values[0]) + " but it was reflected."
                    break;
            }
        });
        
        //enact item effect
        target.timeout(config.itemTimeoutDuration * 1000);

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
        //check if caster still has item
        let caster = workingData[interaction.guildId].users.find(obj => {
            return obj.id == interaction.user.id;
        });

        let itemEntryIndex = caster.itemInventory.findIndex(obj => {
            return obj.name == "item_emp";
        });

        if (itemEntryIndex < 0) {
            notifDontHaveItem(interaction);
            return;
        }

        //get targetted channel
        let target = interaction.channels.get(interaction.values[0]);

        //consume item
        if (caster.itemInventory[itemEntryIndex].count == 1) {
            caster.itemInventory.splice(itemEntryIndex, 1);
        } else {
            caster.itemInventory[itemEntryIndex].count -= 1;
        }

        //instantiate server/caster notification message
        let casterString = `${interaction.member.nickname ? `${interaction.member.nickname}(${interaction.user.tag})` : interaction.user.tag}`;
        let targetString = `${target.name}`;
        let sNotifMsg = `${casterString} has used 150 Tech-savy Apes on voice channel: ${targetString}.`;
        let cNotifMsg = "You've used Tech-savy Apes on the voice channel: " + targetString + ".";
        
        //enact item effect
        target.setBitrate(8000);

        (async (targetChannel) => {
            let timeoutDuration = config.itemEMPDuration;
            await setTimeout(() => {
                targetChannel.setBitrate(64000);
            }, timeoutDuration * 1000);
        })(target)

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