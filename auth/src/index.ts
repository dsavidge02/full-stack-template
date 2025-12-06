import express from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";

const app = express().disable("x-powered-by");

import dotenv from "dotenv";
dotenv.config();
const env = process.env.ENVIRONMENT;
if (!env) throw new Error('Missing ENVIRONMENT.');
const port = process.env.AUTH_SERVICE_PORT;
if (!port) throw new Error('Missing AUTH_SERVICE_PORT.');
const mongoURI = process.env.AUTH_SERVICE_MONGO_URI;
if (!mongoURI) throw new Error('Missing AUTH_SERVICE_MONGO_URI.');

const corsAllowedOrigins = [
    "http://localhost:8080",
    "https://savidgeapps.com",
    "http://savidgeapps.com"
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

import { logger } from "./middleware/logEvents";
app.use(logger);

import loginRouter from "./routes/login";
app.use("/login", loginRouter);

import logoutRouter from "./routes/logout";
app.use("/logout", logoutRouter);

import refreshTokenRouter from "./routes/refreshToken";
app.use("/refresh", refreshTokenRouter);

import registerRouter from "./routes/register";
app.use("/register", registerRouter);

import userRouter from "./routes/protected/user";
app.use("/user", userRouter);

import usersRouter from "./routes/protected/users";
app.use("/users", usersRouter);

import { errorHandler } from "./middleware/errorHandler";
app.use(errorHandler);

import { mongoConnector } from "@dsavidge02/mongo-connector-ts";

let server;

mongoConnector.connect(mongoURI)
    .then(() => {
        mongoConnector.setDB("auth");
        server = app.listen(port, () => {
            console.log(`Auth service is running on port:${port}`);
        });
    })
    .catch((err) => {
        console.error('ERROR: Failed to connect to MongoDB:', err);
    });