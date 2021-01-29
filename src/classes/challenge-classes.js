const config = require("../../config/config");
const DiscordMessage = require('./discord-message');
const prettyMs = require('pretty-ms')
const placeholderParse = require('../utilities/parse-placeholders')

class StopwatchManager {
    constructor(options) {
        for (let option in options) {
            this[option] = options[option];
        }
        this.constructor.stopwatches[this.id] = this;
        console.log(`Successfully registered stopwatch ${this.id}`)
    }
    async instruct(instruction, discordClient, message) {
        let args = instruction.split(' ');
        if (!args[1]) return;
        switch (args[0]) {
            case 'stop':
                let messages = await discordClient.channels.cache.get(config.botCommunicationChannel).messages.fetch({limit: 100});
                let filteredMessages = messages.filter(message => message.content.includes(`${this.id} start ${args[1]}`))
                if(!filteredMessages) return;
                let timeDiff = parseInt(message.createdTimestamp - filteredMessages.first().createdTimestamp)
                //placeholder stuff
                var placeholders = {}
                for(let property in this) {
                    placeholders[`%${property}%`] = this[property];
                }
                placeholders['%time%'] = prettyMs(timeDiff);
                placeholders['%name%'] = args[1];

                //commands
                for(let command in this.minecraftResultCommands) {
                    new DiscordMessage(discordClient, config.consoleChannel, await placeholderParse(this.minecraftResultCommands[command], placeholders))
                }
                filteredMessages.forEach(f => f.delete());
                message.delete();
                break;
        }
    }
    static stopwatches = {}
    static getStopwatch (id) {
        if(this.stopwatches[id]) {
            return this.stopwatches[id];
        }
    }

}

module.exports = { StopwatchManager }
