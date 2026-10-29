const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const port = 3102;
const baseUrl = `http://127.0.0.1:${port}`;



test('MiniShop PostgreSQL integration tests', async (t) => {
  
  const databaseUrl = process.env.TEST_DATABASE_URL;

  
  assert.ok(databaseUrl, 'TEST_DATABASE_URL must be configured for integration tests');



  const server = spawn(process.execPath, ['dist/server.js'], {
    
    cwd: process.cwd(),
    
    env: {...process.env, PORT: String(port), DATABASE_URL: databaseUrl},
    
    stdio: 'inherit'
  });


  t.after(() => server.kill());



  let ready = false;


  for (let attempt = 0; attempt < 40; attempt++) {

    if (server.exitCode !== null) {
      throw new Error('Backend exited before becoming ready');
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);

      if (response.ok) {
        ready = true;
        break;
      }
    } 
    
    catch {
      // Backend may still be starting.
    }


    await new Promise(resolve => setTimeout(resolve, 200));
  }


  assert.ok(ready, 'Backend did not become ready');



  await t.test('Database health endpoint confirms connectivity', async () => {
    const response = await fetch(`${baseUrl}/api/db-health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.database, 'connected');
    assert.ok(data.currentTime);
  });



  await t.test('Products endpoint returns HTTP 200', async () => {
    const response = await fetch(`${baseUrl}/api/products`);

    assert.equal(response.status, 200);
  });



  await t.test('Products endpoint returns eight products', async () => {
    const response = await fetch(`${baseUrl}/api/products`);
    const data = await response.json();

    assert.equal(data.status, 'ok');
    assert.equal(data.count, 8);
    assert.equal(data.products.length, 8);
  });



  await t.test('Products contain valid catalogue fields', async () => {
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
  
    assert.equal(data.products[0].name, 'Wireless Mouse');
    assert.equal(data.products[7].name, 'Wireless Charger');
  });

});
