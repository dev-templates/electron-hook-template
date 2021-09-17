import * as winston from "winston";
import * as Transport from "winston-transport";


const LEVEL = Symbol.for('level');
interface infoType {
    message: string,
    [LEVEL]: string,
}

export class ConsoleForElectron extends Transport {
    constructor(options?: Transport.TransportStreamOptions) {
        super(options);
    }

    public log (info: infoType, next: () => void): void {
        try {
            // const MESSAGE = Symbol.for('message');
            let message;
            if (!(message = info.message)) {
                console.log(info);
                return;
            }

            const level = info[LEVEL];
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
            if (next) {
                next();
            }
        }
    }
}

export function createDefaultLogger (logfile: string): winston.Logger {
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