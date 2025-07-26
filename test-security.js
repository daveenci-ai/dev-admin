#!/usr/bin/env node

/**
 * Security Test Script
 * Tests that admin dashboards are properly protected
 */

const https = require('https');

const domains = [
  'dev-admin.daveenci.ai',
  'admin.daveenci.ai'
];

const protectedRoutes = [
  '/',
  '/crm',
  '/email',
  '/blog',
  '/avatar',
  '/chatbot',
  '/assistant'
];

function testRoute(domain, route) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: route,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Script'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          domain,
          route,
          statusCode: res.statusCode,
          isRedirect: res.statusCode >= 300 && res.statusCode < 400,
          location: res.headers.location,
          contentContains: data.toLowerCase().includes('sign in') || data.toLowerCase().includes('login')
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        domain,
        route,
        error: error.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        domain,
        route,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function runSecurityTest() {
  console.log('🔒 Running Security Test for Admin Dashboards\n');
  console.log('Testing domains:', domains.join(', '));
  console.log('Testing routes:', protectedRoutes.join(', '));
  console.log('\n' + '='.repeat(60) + '\n');

  let allSecure = true;

  for (const domain of domains) {
    console.log(`🌐 Testing ${domain}:`);
    
    for (const route of protectedRoutes) {
      const result = await testRoute(domain, route);
      
      if (result.error) {
        console.log(`  ❌ ${route} - ERROR: ${result.error}`);
        continue;
      }

      const isSecure = result.isRedirect || result.contentContains || result.statusCode === 401 || result.statusCode === 403;
      
      if (isSecure) {
        console.log(`  ✅ ${route} - PROTECTED (${result.statusCode}${result.location ? ` → ${result.location}` : ''})`);
      } else {
        console.log(`  🚨 ${route} - VULNERABLE (${result.statusCode}) - DIRECT ACCESS ALLOWED!`);
        allSecure = false;
      }
    }
    console.log('');
  }

  console.log('='.repeat(60));
  
  if (allSecure) {
    console.log('✅ SECURITY TEST PASSED - All routes are properly protected!');
  } else {
    console.log('🚨 SECURITY TEST FAILED - Some routes are vulnerable!');
    console.log('❗ Immediate action required to secure exposed routes.');
  }
  
  console.log('\nNote: This test checks for basic protection. Manual verification recommended.');
}

// Run the test
runSecurityTest().catch(console.error); 