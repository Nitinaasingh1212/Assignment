import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import app from '../src/app.js';

test('authentication, refresh rotation, and owner-scoped product CRUD', {
  skip: !process.env.MONGODB_URI_TEST && 'Set MONGODB_URI_TEST to run database integration tests.',
}, async () => {
  await mongoose.connect(process.env.MONGODB_URI_TEST);
  const suffix = randomUUID();
  const email = `fieldwork-${suffix}@example.test`;
  const secondEmail = `fieldwork-other-${suffix}@example.test`;
  const password = 'FieldworkPass123';
  const firstAgent = request.agent(app);
  const secondAgent = request.agent(app);
  let firstUserId;
  let secondUserId;
  let productId;

  try {
    const registration = await firstAgent.post('/api/auth/register').send({
      name: 'Fieldwork Test', email, password, confirmPassword: password,
    });
    assert.equal(registration.status, 201);
    assert.equal(registration.body.user.email, email);
    assert.equal('password' in registration.body.user, false);
    assert.equal('accessToken' in registration.body, false);
    firstUserId = registration.body.user.id;

    const duplicate = await firstAgent.post('/api/auth/register').send({
      name: 'Fieldwork Test', email, password, confirmPassword: password,
    });
    assert.equal(duplicate.status, 409);

    const login = await firstAgent.post('/api/auth/login').send({ email, password });
    assert.equal(login.status, 200);
    const firstAccessToken = login.body.accessToken;
    assert.ok(firstAccessToken);
    const originalRefreshCookie = login.headers['set-cookie'].find((cookie) => cookie.startsWith('fieldwork_refresh=')).split(';')[0];
    const profile = await firstAgent.get('/api/auth/me').set('Authorization', `Bearer ${firstAccessToken}`);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.id, firstUserId);

    const created = await firstAgent.post('/api/products').set('Authorization', `Bearer ${firstAccessToken}`).send({
      name: 'Test object', description: 'Temporary integration-test product', category: 'Test', price: 12.5, stock: 3,
    });
    assert.equal(created.status, 201);
    productId = created.body.product._id;
    assert.equal(created.body.product.owner, firstUserId);

    const publicDetail = await request(app).get(`/api/products/${productId}`);
    assert.equal(publicDetail.status, 200);
    assert.equal(publicDetail.body.product.name, 'Test object');

    const otherRegistration = await secondAgent.post('/api/auth/register').send({
      name: 'Other Test', email: secondEmail, password, confirmPassword: password,
    });
    assert.equal(otherRegistration.status, 201);
    secondUserId = otherRegistration.body.user.id;
    const secondLogin = await secondAgent.post('/api/auth/login').send({ email: secondEmail, password });
    assert.equal(secondLogin.status, 200);
    const secondAccessToken = secondLogin.body.accessToken;

    const deniedUpdate = await secondAgent.put(`/api/products/${productId}`).set('Authorization', `Bearer ${secondAccessToken}`).send({ name: 'Changed' });
    assert.equal(deniedUpdate.status, 404);
    const deniedDelete = await secondAgent.delete(`/api/products/${productId}`).set('Authorization', `Bearer ${secondAccessToken}`);
    assert.equal(deniedDelete.status, 404);

    const updated = await firstAgent.put(`/api/products/${productId}`).set('Authorization', `Bearer ${firstAccessToken}`).send({ price: 18 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.product.price, 18);
    const deleted = await firstAgent.delete(`/api/products/${productId}`).set('Authorization', `Bearer ${firstAccessToken}`);
    assert.equal(deleted.status, 200);

    const refreshed = await firstAgent.post('/api/auth/refresh-token');
    assert.equal(refreshed.status, 200);
    assert.notEqual(refreshed.body.accessToken, firstAccessToken);
    const replay = await request(app).post('/api/auth/refresh-token').set('Cookie', originalRefreshCookie);
    assert.equal(replay.status, 401);

    const logout = await firstAgent.post('/api/auth/logout').set('Authorization', `Bearer ${refreshed.body.accessToken}`);
    assert.equal(logout.status, 200);
    const revokedRefresh = await firstAgent.post('/api/auth/refresh-token');
    assert.equal(revokedRefresh.status, 401);
  } finally {
    if (productId) await Product.deleteOne({ _id: productId });
    if (firstUserId || secondUserId) {
      await User.deleteMany({ _id: { $in: [firstUserId, secondUserId].filter(Boolean) } });
    }
    await mongoose.disconnect();
  }
});