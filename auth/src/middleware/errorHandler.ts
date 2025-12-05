import { ErrorRequestHandler } from "express";
import { logEvents } from "./logEvents";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    // Log full error details including stack trace
    const errorDetails = [
        `Error: ${err.name}`,
        `Message: ${err.message}`,
        `Stack: ${err.stack || 'No stack trace available'}`,
        `Error Object: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
    ].join('\n');
    
    logEvents(errorDetails, 'errLog.txt');
    console.error('Error caught by global error handler:', err);
    console.error('Stack trace:', err.stack);
    
    // Return error message (controllers will handle making messages generic)
    res.status(500).json({
        'message': err.message
    });
};