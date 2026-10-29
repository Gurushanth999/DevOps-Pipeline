const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';



test('MiniShop full-stack deployment tests', async (t) => {
  
  await t.test('Frontend is served through Nginx', async () => {
    const response = await fetch(baseUrl);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<html\b/i);
  });



  await t.test('Nginx proxies backend health endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.application, 'MiniShop');
    assert.equal(data.service, 'backend');
  });



  await t.test('Nginx proxies database health endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/db-health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.database, 'connected');
  });



  await t.test('Full-stack products endpoint returns eight products', async () => {
    const response = await fetch(`${baseUrl}/api/products`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.count, 8);
    assert.equal(data.products.length, 8);
  });



  await t.test('Full-stack products contain expected catalogue fields', async () => {
    const response = await fetch(`${baseUrl}/api/products`);
    const data = await response.json();


    for (const product of data.products) {
        
      assert.ok(Number.isInteger(product.id));
      assert.equal(typeof product.name, 'string');
      assert.ok(product.name.length > 0);
      assert.ok(Number(product.price) >= 0);
      assert.ok(Number.isInteger(product.stock_quantity));
      assert.ok(product.stock_quantity >= 0);
    }
  });

});
