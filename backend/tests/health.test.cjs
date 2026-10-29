const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const port = 3101;
const baseUrl = `http://127.0.0.1:${port}`;



test('MiniShop API smoke tests', async (t) => {

  const server = spawn(process.execPath, ['dist/server.js'], {

    cwd: process.cwd(),

    env: {...process.env, PORT: String(port), DATABASE_URL: 'postgres://minishop:testpassword@127.0.0.1:5432/minishop'},

    stdio: 'pipe'
  });


  t.after(() => {server.kill();});



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
      // Wait for the backend to start.
    }


    await new Promise(resolve => setTimeout(resolve, 200));
  }


  assert.ok(ready, 'Backend did not become ready');



  await t.test('GET / returns HTTP 200', async () => {
    const response = await fetch(`${baseUrl}/`);

    assert.equal(response.status, 200);
  });



  await t.test('GET / returns the welcome message', async () => {
    const response = await fetch(`${baseUrl}/`);
    const data = await response.json();

    assert.deepEqual(data, {message: 'Welcome to the MiniShop API!'});
  });



  await t.test('GET /api/health returns valid health data', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(data, {status: 'ok', application: 'MiniShop', service: 'backend'});
  });

});
