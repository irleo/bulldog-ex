import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import mongoose from 'mongoose';
import { createAuditLogger } from '../middleware/auditLoggerMiddleware.js';
import { vercelClientIp } from '../middleware/deploymentMiddleware.js';

test('client IP ignores forged headers locally and accepts only valid Vercel addresses', () => {
  const original = process.env.VERCEL;
  try {
    delete process.env.VERCEL;
    const request = { ip: '127.0.0.1', get: () => '203.0.113.5' };
    let error;
    vercelClientIp(request, {}, value => { error = value; });
    assert.equal(request.ip, '127.0.0.1');
    process.env.VERCEL = '1';
    vercelClientIp(request, {}, value => { error = value; });
    assert.equal(request.ip, '203.0.113.5');
    assert.equal(error, undefined);
    for (const header of [undefined, 'spoofed', '203.0.113.5, 198.51.100.1']) {
      vercelClientIp({ get: () => header }, {}, value => { error = value; });
      assert.equal(error.statusCode, 400);
    }
  } finally {
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
  }
});

test('concurrent cold requests share initialization and a failed connection can retry', async () => {
  let attempts = 0;
  const connect = mock.method(mongoose, 'connect', async () => {
    attempts += 1;
    await Promise.resolve();
    if (attempts === 1) throw new Error('Simulated connection failure');
    return mongoose;
  });
  const log = mock.method(console, 'error', () => {});
  const indexes = Object.values(mongoose.models).map(model => mock.method(model, 'init', async () => model));
  try {
    const { default: connectDB } = await import('../config/db.js?deployment-test');
    await assert.rejects(connectDB(), /Simulated connection failure/);
    const results = await Promise.all(Array.from({ length: 10 }, () => connectDB()));
    assert.equal(attempts, 2);
    assert.ok(results.every(result => result === mongoose));
    await connectDB();
    assert.equal(attempts, 2);
  } finally {
    connect.mock.restore();
    for (const index of indexes) index.mock.restore();
    log.mock.restore();
  }
});

test('Vercel retains the audit task until its write settles, including write failures', async () => {
  const contextKey = Symbol.for('@vercel/request-context');
  const originalContext = globalThis[contextKey];
  const originalVercel = process.env.VERCEL;
  const log = mock.method(console, 'error', () => {});
  try {
    process.env.VERCEL = '1';
    for (const fail of [false, true]) {
      let task;
      let release;
      let finished = false;
      globalThis[contextKey] = { get: () => ({ waitUntil: promise => { task = promise; } }) };
      const middleware = createAuditLogger(async () => {
        await new Promise(resolve => { release = resolve; });
        if (fail) throw new Error('Simulated audit failure');
      });
      const response = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: true });
      middleware({ originalUrl: '/api/v1/products?secret=excluded', method: 'GET', ip: '127.0.0.1' }, response, () => {});
      assert.ok(task instanceof Promise);
      task.then(() => { finished = true; });
      response.emit('finish');
      await Promise.resolve();
      assert.equal(finished, false);
      release();
      await task;
      assert.equal(finished, true);
    }
  } finally {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
    if (originalContext === undefined) delete globalThis[contextKey];
    else globalThis[contextKey] = originalContext;
    log.mock.restore();
  }
});
