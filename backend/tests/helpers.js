const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();
let mongo;

async function startDB() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build unique indexes
}
async function stopDB() {
  await mongoose.disconnect();
  await mongo.stop();
}
async function clearDB() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}
async function registerUser(overrides = {}) {
  const body = {
    name: 'Test Student',
    email: `s${Date.now()}${Math.random().toString(16).slice(2)}@example.com`,
    password: 'Passw0rd1',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { token: res.body.token, user: res.body.user, body };
}

module.exports = { app, request, startDB, stopDB, clearDB, registerUser };