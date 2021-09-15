import winston = require("winston");
import TransportStream = require("winston-transport");

export class ConsoleForElectron extends TransportStream {
    constructor(options?: TransportStream.TransportStreamOptions) {
        super(options);
    }

    public log (info: any, callback: Function) {
        try {
            // const MESSAGE = Symbol.for('message');
            const LEVEL = Symbol.for('level');
            let message = info.message;
            if (!message) {
                console.log(info);
                return;
            }

            let level = info[LEVEL];
            switch (level) {
                case 'debug':
                    console.debug(message);
                    break;
                case 'info':
                    console.info(message);
                    break;
                case 'warn':
                    console.warn(message);
                    break;
                case 'error':
                    console.error(message);
                    break;
                default:
                    console.log(message);
            }
        }
        finally {
            if (callback) {
                callback();
            }
        }
    }
}

export function createDefaultLogger (logfile: string) {
    return winston.createLogger({
        level: 'info',
        transports: [
            new winston.transports.File({
                format: winston.format.combine(
                    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                    winston.format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`),
                ),
                filename: logfile,
            }),
            new ConsoleForElectron({
                format: winston.format.colorize(),
            }),
        ]
    });
}