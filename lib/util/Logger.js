const winston = require('winston')

const logformat = process.env.LOG_IS_LOCAL && process.env.LOG_IS_LOCAL == 'true'
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.simple()
    ) 
    : winston.format.combine(
        winston.format.splat(),
        winston.format.simple()
    )

const Logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console()
    ],
    format: logformat
})

module.exports = Logger
