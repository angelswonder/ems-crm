// Direct Database Insertion Script using Service Role
// This script creates test organization and profile data bypassing email limits

const https = require('https');

// Configuration
const SUPABASE_URL = 'https://lodvqqhkrccqhsogfhim.supabase.co';
const SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZHZxcWhrcmNjcWhzb2dmaGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ1NTgxNCwiZXhwIjoyMDkyMDMxODE0fQ.yPR6KXbeA0vpjMGsXhymXy-nMX1WSIh17HjCgZOLwOo;

// Test data
const TEST_ORG_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_EMAIL = 'testuser@company.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_ORG_NAME = 'Test Development Company';
const TEST_ORG_SLUG = 'test-dev-company-' + Math.floor(Date.now() / 1000);
const TEST_USER_NAME = 'John Developer';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set!');
  console.error('\nTo use this script, you need to:');
  console.error('1. Get your service role key from Supabase dashboard');
  console.error('2. Set it as an environment variable:');
  console.error('   Windows: set SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.error('   Linux/Mac: export SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.error('3. Run this script again');
  process.exit(1);
}

console.log('🚀 Starting test data insertion...\n');
console.log('Test Details:');
console.log('  Email:', TEST_EMAIL);
console.log('  Password:', TEST_PASSWORD);
console.log('  Organization:', TEST_ORG_NAME);
console.log('  Org Slug:', TEST_ORG_SLUG);
console.log('  User Name:', TEST_USER_NAME);

// Helper function for API requests
function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Step 1: Create auth user
async function createAuthUser() {
  console.log('\n📝 Step 1: Creating auth user...');
  
  const response = await makeRequest('/auth/v1/admin/users', 'POST', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: TEST_USER_NAME,
      user_type: 'organization',
    },
  });

  if (response.status > 299) {
    throw new Error(`Failed to create user: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  const userId = response.data.id;
  console.log('✅ User created:', userId);
  return userId;
}

// Step 2: Create organization
async function createOrganization() {
  console.log('\n🏢 Step 2: Creating organization...');
  
  const response = await makeRequest('/rest/v1/organizations', 'POST', {
    id: TEST_ORG_ID,
    name: TEST_ORG_NAME,
    slug: TEST_ORG_SLUG,
    plan_type: 'free',
    subscription_status: 'active',
    billing_email: TEST_EMAIL,
  });

  if (response.status > 299) {
    throw new Error(`Failed to create organization: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  console.log('✅ Organization created:', TEST_ORG_ID);
  return TEST_ORG_ID;
}

// Step 3: Create profile
async function createProfile(userId, orgId) {
  console.log('\n👤 Step 3: Creating profile...');
  
  const response = await makeRequest('/rest/v1/profiles', 'POST', {
    id: userId,
    org_id: orgId,
    full_name: TEST_USER_NAME,
    email: TEST_EMAIL,
    role: 'owner',
    is_super_admin: false,
    theme_preference: 'dark',
    email_notifications: true,
  });

  if (response.status > 299) {
    throw new Error(`Failed to create profile: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  console.log('✅ Profile created for user:', userId);
  return response.data[0];
}

// Step 4: Verify data
async function verifyData(userId, orgId) {
  console.log('\n🔍 Step 4: Verifying data...');
  
  const orgRes = await makeRequest(`/rest/v1/organizations?id=eq.${orgId}`, 'GET');
  if (orgRes.data.length === 0) throw new Error('Organization not found in database');
  console.log('✅ Organization verified');

  const profileRes = await makeRequest(`/rest/v1/profiles?id=eq.${userId}`, 'GET');
  if (profileRes.data.length === 0) throw new Error('Profile not found in database');
  console.log('✅ Profile verified');
  console.log('✅ Profile org_id matches:', profileRes.data[0].org_id === orgId);
}

// Main execution
async function main() {
  try {
    const userId = await createAuthUser();
    const orgId = await createOrganization();
    await createProfile(userId, orgId);
    await verifyData(userId, orgId);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! Test data created successfully');
    console.log('='.repeat(60));
    console.log('\n📋 TEST CREDENTIALS:');
    console.log('   Email:       ' + TEST_EMAIL);
    console.log('   Password:    ' + TEST_PASSWORD);
    console.log('   Organization: ' + TEST_ORG_NAME);
    console.log('   Org Slug:    ' + TEST_ORG_SLUG);
    console.log('\n🔗 Login URL: http://localhost:5174/auth/organization-login');
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
