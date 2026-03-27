"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./router/routes"));
const redis_1 = require("./config/redis");
const expiration_worker_1 = require("./workers/expiration.worker");
const kafka_1 = require("./config/kafka");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(routes_1.default);
async function start() {
    await (0, redis_1.connectRedis)();
    (0, expiration_worker_1.startExpirationWorker)();
    await kafka_1.producer.connect();
    app.listen(5003, () => {
        console.log("Booking service running on port 5003");
    });
}
start();
