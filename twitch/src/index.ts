import express from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import { Server as HTTPServer } from "http";

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

import goalsRouter from "./routes/goals";
app.use("/goals", goalsRouter);

import dashboardRouter from "./routes/dashboard";
app.use("/dashboard", dashboardRouter);

import { errorHandler } from "./middleware/errorHandler";
app.use(errorHandler);

// MongoDB connection and server startup
import { mongoConnector } from "@dsavidge02/mongo-connector-ts";

const mongoURI = process.env.TWITCH_SERVICE_MONGO_URI;
if (!mongoURI) throw new Error('Missing TWITCH_SERVICE_MONGO_URI.');

// Initialize EventSub service on startup
import TwitchEventSubService from "./services/twitchEventSubService";
import DashboardWebSocketService from "./services/dashboardWebSocketService";

mongoConnector.connect(mongoURI)
    .then(() => {
        mongoConnector.setDB("twitch");
        console.log('Connected to MongoDB (twitch database)');

        TwitchEventSubService.getInstance().initialize()
            .then(() => {
                console.log('EventSub service initialized');
            })
            .catch((err) => {
                console.error('Failed to initialize EventSub service:', err);
            });

        const server = app.listen(port, () => {
            console.log(`Twitch service is running on port:${port}`);
        });

        // Initialize Dashboard WebSocket service
        DashboardWebSocketService.getInstance().initialize(server);
    })
    .catch((err) => {
        console.error('ERROR: Failed to connect to MongoDB:', err);
    });