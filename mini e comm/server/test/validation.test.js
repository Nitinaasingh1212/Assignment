import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import app from '../src/app.js';

test('registration returns field-level errors for invalid account data', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'A',
    email: 'not-an-email',
    password: 'weak',
    confirmPassword: 'different',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Validation failed.');
  assert.deepEqual(new Set(response.body.errors.map((error) => error.field)), new Set(['name', 'email', 'password', 'confirmPassword']));
});

test('login rejects an invalid email before database access', async () => {
  const response = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'password' });

  assert.equal(response.status, 400);
  assert.equal(response.body.errors[0].field, 'email');
});

test('product list validates pagination queries', async () => {
  const response = await request(app).get('/api/products?limit=0');

  assert.equal(response.status, 400);
  assert.equal(response.body.errors[0].field, 'limit');
});

test('product detail validates IDs before database access', async () => {
  const response = await request(app).get('/api/products/not-an-id');

  assert.equal(response.status, 400);
  assert.equal(response.body.errors[0].field, 'id');
});

test('product writes validate IDs and fields before authentication or database access', async () => {
  const invalidCreate = await request(app).post('/api/products').send({ name: '', price: -1, stock: 1.5 });
  assert.equal(invalidCreate.status, 400);
  assert.deepEqual(new Set(invalidCreate.body.errors.map((error) => error.field)), new Set(['name', 'category', 'price', 'stock']));

  const invalidUpdate = await request(app).put('/api/products/not-an-id').send({ name: '' });
  assert.equal(invalidUpdate.status, 400);
  assert.ok(invalidUpdate.body.errors.some((error) => error.field === 'id'));

  const invalidDelete = await request(app).delete('/api/products/not-an-id');
  assert.equal(invalidDelete.status, 400);
  assert.equal(invalidDelete.body.errors[0].field, 'id');
});