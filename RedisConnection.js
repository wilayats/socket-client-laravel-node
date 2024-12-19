const redis = require('async-redis');
const client = redis.createClient(6379);
var moment = require('moment');

async function setCache(channel_name, data) {
    return await client.set(channel_name, JSON.stringify(data))
}


async function getCache(channel) {
    var data = await get(channel);
    return (data);
}

async function getPossiblesKeys(channel) {
    var data = await keys(channel);
    return (data);
}


async function get(key) {
    return await client.get(key);
}

async function keys(key) {
    return await client.keys(key);
}

async function clearCache(channel_name) {
    return await clear(channel_name);
}

async function clear(key) {
    return await client.del(key);
}

module.exports = {
    setCache,getCache
}