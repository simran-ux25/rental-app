"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.connectRedis = connectRedis;
const redis_1 = require("redis");
exports.redis = (0, redis_1.createClient)({
    url: "redis://localhost:6379"
});
exports.redis.on("error", (err) => {
    console.error("Redis error", err);
});
async function connectRedis() {
    await exports.redis.connect();
}
