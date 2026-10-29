const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendDir = path.resolve(__dirname, '..');
const distDir = path.join(frontendDir, 'dist');
const indexPath = path.join(distDir, 'index.html');



test('MiniShop frontend production smoke tests', async (t) => {
  
  await t.test('Production HTML file exists', () => {
    assert.ok(fs.existsSync(indexPath), 'Expected dist/index.html to exist. Run npm run build first.');
  });


  const html = fs.readFileSync(indexPath, 'utf8');



  await t.test('HTML contains a valid document structure', () => {
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<html\b/i);
    assert.match(html, /<title>[^<]+<\/title>/i);
  });



  await t.test('HTML contains the application root element', () => {
    assert.match(html, /<div\s+[^>]*id=["']root["']/i, 'Expected a root element for the frontend application');
  });



  await t.test('Production JavaScript assets exist', () => {
    const assetsDir = path.join(distDir, 'assets');

    assert.ok(fs.existsSync(assetsDir), 'Expected dist/assets directory to exist');

    
    const files = fs.readdirSync(assetsDir);

    assert.ok(files.some((file) => file.endsWith('.js')), 'Expected at least one generated JavaScript file');
  });



  await t.test('HTML references existing JavaScript assets', () => {
    
    const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);

    assert.ok(scriptSources.length > 0, 'Expected at least one JavaScript script reference');


    for (const source of scriptSources) {
      
      const assetPath = source
        .replace(/^\//, '')
        .split('?')[0]
        .split('#')[0];

      const fullPath = path.resolve(distDir, assetPath);


      assert.ok(fullPath.startsWith(distDir + path.sep), 'Script path must remain inside dist');
      assert.ok(fs.existsSync(fullPath), `Referenced JavaScript asset does not exist: ${source}`);
    }
  });

});
