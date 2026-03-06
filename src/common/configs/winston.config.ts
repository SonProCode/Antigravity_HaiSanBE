import { format, transports } from 'winston';
import { WinstonModuleOptions } from 'nest-winston';

export const winstonConfig: WinstonModuleOptions = {
    transports: [
        new transports.Console({
            format: format.combine(
                format.timestamp(),
                format.ms(),
                format.colorize(),
                format.printf(({ timestamp, level, message, context, ms }) => {
                    return `[Nest] ${timestamp} ${level} [${context || 'App'}] ${message} ${ms}`;
                }),
            ),
        }),
    ],
};
