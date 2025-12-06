import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
const fsPromises = fs.promises;
import path from 'path';
import { RequestHandler } from 'express';

export const logEvents = async (message: string, logName: string) => {
    const dateTime = `${format(new Date(), 'yyyyMMdd\tHH:mm:ss')}`;
    const logItem = `${dateTime}\t${uuid()}\t${message}\n`;

    const logsDir = path.resolve(__dirname, '../..', 'logs');
    const logPath = path.join(logsDir, logName);

    try {
        if (!fs.existsSync(logsDir)) {
            await fsPromises.mkdir(logsDir, { recursive: true });
        }

        await fsPromises.appendFile(logPath, logItem);
    }
    catch (err) {
        console.log(err);
    }
};

export const logger: RequestHandler =  (req, res, next) => {
    logEvents(`${req.method}\t${req.headers.origin || 'unknown'}\t${req.url}`, 'requestLog.txt');
    console.log(`${req.method} ${req.path}`);
    next();
};