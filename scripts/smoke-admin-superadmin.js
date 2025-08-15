#!/usr/bin/env node
/*
  Simple smoke test for Admin and SuperAdmin endpoints.
  Usage:
    ADMIN_TOKEN=... SUPERADMIN_TOKEN=... BASE_URL=http://localhost:5000 node scripts/smoke-admin-superadmin.js
*/
const axios = require('axios');
const tokenSuperAdmin='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODljNTEyMzBmNGVlNTk3NjNkNWZlYjMiLCJpZCI6IjY4OWM1MTIzMGY0ZWU1OTc2M2Q1ZmViMyIsInJvbGUiOiJzdXBlcmFkbWluIiwiZW1haWwiOiJzdXBlckBhZG1pbi51eiIsImJyYW5jaCI6bnVsbCwiaWF0IjoxNzU1MTY2NTY2LCJleHAiOjE3NTUyNTI5NjZ9.XJU7H26Y4n4ecoBjEsl8dbPwzyZKADaP67fVYCajhw0';

const tokenAdmin='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODljNTEyMTBmNGVlNTk3NjNkNWZlYWEiLCJpZCI6IjY4OWM1MTIxMGY0ZWU1OTc2M2Q1ZmVhYSIsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW4xQGdtYWlsLmNvbSIsImJyYW5jaCI6IjY4OWM1MTIwMGY0ZWU1OTc2M2Q1ZmU5ZCIsImlhdCI6MTc1NTE3NzgxMCwiZXhwIjoxNzU1MjY0MjEwfQ.LrnuKkDC0KP3GPGdYR_fEB66TPkpcmdBR5WX8YgOEQY';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || tokenAdmin;
const SUPERADMIN_TOKEN = process.env.SUPERADMIN_TOKEN || tokenSuperAdmin;

if (!ADMIN_TOKEN || !SUPERADMIN_TOKEN) {
  console.error('Please set ADMIN_TOKEN and SUPERADMIN_TOKEN env vars.');
  process.exit(1);
}

async function run() {
  const results = [];
  async function hit(name, method, url, token, data) {
    try {
      const res = await axios({ method, url: BASE_URL + url, data, headers: { Authorization: `Bearer ${token}` } });
      results.push({ name, ok: true, status: res.status });
    } catch (e) {
      results.push({ name, ok: false, status: e.response?.status, error: e.response?.data || e.message });
    }
  }

  // Admin endpoints
  await hit('admin:dashboard', 'get', '/api/admin/dashboard', ADMIN_TOKEN);
  await hit('admin:branches', 'get', '/api/admin/branches', ADMIN_TOKEN);
  await hit('admin:products', 'get', '/api/admin/products', ADMIN_TOKEN);
  await hit('admin:orders', 'get', '/api/admin/orders', ADMIN_TOKEN);
  await hit('admin:orders:stats', 'get', '/api/admin/orders/stats', ADMIN_TOKEN);
  await hit('admin:categories', 'get', '/api/admin/categories', ADMIN_TOKEN);
  // Tables (admin)
  await hit('admin:tables:list', 'get', '/api/tables', ADMIN_TOKEN);
  // Inventory list requires :branchId. Try admin branch inferred from token context; if not, skip silently.
  // This smoke test only verifies 200/403/401 responses, not payloads.

  // SuperAdmin endpoints
  await hit('superadmin:admins:list', 'get', '/api/superadmin/admins', SUPERADMIN_TOKEN);
  await hit('superadmin:branches:list', 'get', '/api/superadmin/branches', SUPERADMIN_TOKEN);
  await hit('superadmin:dashboard', 'get', '/api/superadmin/dashboard', SUPERADMIN_TOKEN);
  // Optionally: create/update/delete admin/branch can be added behind a flag to avoid destructive ops.

  // Dashboard analytics (admin scope, but supports superadmin via filters)
  await hit('dashboard:analytics:sales', 'get', '/api/dashboard/analytics/sales', ADMIN_TOKEN);
  await hit('dashboard:analytics:orders', 'get', '/api/dashboard/analytics/orders', ADMIN_TOKEN);
  await hit('dashboard:chart-data', 'get', '/api/dashboard/chart-data', ADMIN_TOKEN);
  await hit('dashboard:stats', 'get', '/api/dashboard/stats', ADMIN_TOKEN);

  // Orders endpoints (detail & stats)
  // Note: We do not know a valid order id here; this is a GET list smoke only.
  // Couriers endpoints
  await hit('couriers:list', 'get', '/api/couriers', ADMIN_TOKEN);
  await hit('couriers:available', 'get', '/api/couriers/available/for-order', ADMIN_TOKEN);
  await hit('couriers:heatmap', 'get', '/api/couriers/heatmap', ADMIN_TOKEN);
  await hit('couriers:zones', 'get', '/api/couriers/zones', ADMIN_TOKEN);

 




  // Print results
  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;
  console.log('Smoke results:', { ok, fail });
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.name} -> ${r.status}${r.ok ? '' : ' ' + JSON.stringify(r.error)}`);
  }

  process.exit(fail > 0 ? 1 : 0);
}

run();


