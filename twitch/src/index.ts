import express from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";

const app = express().disable("x-powered-by");

import dotenv from "dotenv";
dotenv.config();

const env = process.env.ENVIRONMENT;
if (!env) throw new Error('Missing ENVIRONMENT.');
const port = process.env.TWITCH_SERVICE_PORT;
if (!port) throw new Error('Missing TWITCH_SERVICE_PORT.');

const corsAllowedOrigins = [
    "https://savidgeapps.com",
    "https://www.savidgeapps.com",
];

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (process.env.ENVIRONMENT === "dev") callback(null, true);
        else if (!origin || corsAllowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({limit: '10mb'}));
app.use(cookieParser());

// Health check endpoint for Kubernetes probes
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
    });
});

import { handleGetStatus } from "./controllers/adminController";
app.get('/status', handleGetStatus);

import { logger } from "./middleware/logEvents";
app.use(logger);

import tokenRouter from "./routes/token";
app.use("/token", tokenRouter);

import adminRouter from "./routes/protected/admin";
app.use("/admin", adminRouter);

import channelRouter from "./routes/channel";
app.use("/channel", channelRouter);

import eventSubRouter from "./routes/protected/eventSub";
app.use("/eventsub", eventSubRouter);

import { errorHandler } from "./middleware/errorHandler";
app.use(errorHandler);

// Initialize EventSub service on startup
import TwitchEventSubService from "./services/twitchEventSubService";
TwitchEventSubService.getInstance().initialize()
    .then(() => {
        console.log('EventSub service initialized');
    })
    .catch((err) => {
        console.error('Failed to initialize EventSub service:', err);
    });

app.listen(port, () => {
    console.log(`Twitch service is running on port:${port}`);
});