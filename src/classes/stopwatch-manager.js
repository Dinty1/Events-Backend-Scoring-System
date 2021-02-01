const config = require("../../config/config");
const DiscordMessage = require('./discord-message');
const prettyMs = require('pretty-ms')
const placeholderParse = require('../utils/parse-placeholders');
const HttpsRequest = require("./https-request");
require('dotenv').config()

class StopwatchManager {
    constructor(options) {
        for (let option in options) {
            this[option] = options[option];
        }
        this.constructor.stopwatches[this.id] = this;
        console.log(`Successfully registered stopwatch ${this.id}`)
    }
    /**
     * 
     * @param {string} instruction 
     * @param {Object} discordClient 
     * @param {Object} message 
     */
    async instruct(instruction, discordClient, message) {
        let args = instruction.split(' ');
        if (!args[1]) return;
        switch (args[0]) {
            case 'stop':
                let messages = await discordClient.channels.cache.get(config.botCommunicationChannel).messages.fetch({ limit: 100 });
                let filteredMessages = messages.filter(message => message.content.includes(`${this.id} start ${args[1]}`))
                if (!filteredMessages) return;
                let timeDiff = parseInt(message.createdTimestamp - filteredMessages.first().createdTimestamp)
                //placeholder stuff
                let placeholders = this;
                placeholders['time'] = prettyMs(timeDiff);
                placeholders['name'] = args[1];

                //commands
                for (let command in this.minecraftResultCommands) {
                    new DiscordMessage(discordClient, config.consoleChannel, await placeholderParse(this.minecraftResultCommands[command], placeholders))
                }
                //discord messages
                for (let timerMsg in this.discordResultMessages) {
                    try {
                        var namedChannel = false;
                        if (this.discordResultMessages[timerMsg].channelName) {
                            namedChannel = discordClient.channels.cache.find(channel => channel.name === placeholderParse(this.discordResultMessages[timerMsg].channelName, placeholders).toLowerCase())
                        }
                        if (namedChannel) {
                            namedChannel.send(await placeholderParse(this.discordResultMessages[timerMsg].content, placeholders))
                        } else {
                            new DiscordMessage(discordClient, this.discordResultMessages[timerMsg].channelID, await placeholderParse(this.discordResultMessages[timerMsg].content, placeholders));
                        }
                    } catch (error) {
                        new DiscordMessage(discordClient, config.botCommunicationChannel, `Error sending a Discord message for stopwatch ${this.id}`)
                        console.log(error)
                    }
                }
                //google sheet stuff
                for (let newRow in this.googleSheetNewRows) {
                    let options = {
                        sheetName: placeholderParse(this.googleSheetNewRows[newRow].sheetName, placeholders),
                        row: []
                    }
                    for (let value in this.googleSheetNewRows[newRow].row) {
                        options.row[value] = placeholderParse(this.googleSheetNewRows[newRow].row[value], placeholders);
                    }
                    new HttpsRequest('script.google.com', process.env.APPS_SCRIPT_PATH, options);
                }
                //clean up
                filteredMessages.forEach(f => f.delete());
                message.delete();
                break;
        }
    }
    static stopwatches = {}
    static getStopwatch(id) {
        if (this.stopwatches[id]) {
            return this.stopwatches[id];
        }
    }

}

module.exports = StopwatchManager
