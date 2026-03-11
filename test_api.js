const http = require('http');

const tests = [
  { name: 'Health Check', path: '/api/health' },
  { name: 'Get Leads', path: '/api/leads/test-user-123' },
  { name: 'Export CSV', path: '/api/leads/test-user-123/export?format=csv' },
  { name: 'Get Tags', path: '/api/tags/test-user-123' },
  { name: 'Search Leads', path: '/api/leads/search?q=test' },
];

async function test(t) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:5000${t.path}`, { timeout: 5000 }, (res) => {
      resolve({ name: t.name, status: res.statusCode, ok: res.statusCode < 400 });
    });
    req.on('error', () => resolve({ name: t.name, status: 'ERR', ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ name: t.name, status: 'TIMEOUT', ok: false }); });
  });
}

(async () => {
  console.log('\n========= CRM TypeScript API Tests =========\n');
  let pass = 0, fail = 0;
  for (const t of tests) {
    const r = await test(t);
    console.log(`${r.ok ? '✅ PASS' : '❌ FAIL'} [${r.status}] ${r.name}`);
    if (r.ok) pass++; else fail++;
  }
  console.log(`\n============ Results: ${pass}/${tests.length} passed ============\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
