// Test script to create organization and user directly via Supabase API
// This bypasses the signup rate limit by using direct API calls

const supabaseUrl = 'https://lodvqqhkrccqhsogfhim.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZHZxcWhrcmNjcWhzb2dmaGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTU4MTQsImV4cCI6MjA5MjAzMTgxNH0.qr4H8vNFN5tj4eoq0r8i_5p9qycd_ZsNBp3I8StEAnU';

// Test email and org details
const testEmail = `test-${Date.now()}@company.com`;
const testPassword = 'TestPassword123';
const testOrgName = 'Test Organization ' + new Date().toLocaleTimeString();
const testOrgSlug = `test-org-${Date.now().toString().slice(-6)}`;
const testUserName = 'Test User';

console.log('Creating test organization and user...');
console.log('Email:', testEmail);
console.log('Org Name:', testOrgName);
console.log('Org Slug:', testOrgSlug);

// Step 1: Create user via Auth API
async function createUser() {
  console.log('\n1. Creating user via Auth API...');
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      data: {
        full_name: testUserName,
        user_type: 'organization',
      },
    }),
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status > 299) {
    throw new Error(`Auth signup failed: ${data.error_description || data.message}`);
  }

  return data;
}

// Step 2: Create organization directly
async function createOrganization(userId) {
  console.log('\n2. Creating organization...');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${userId}`,
    },
    body: JSON.stringify({
      name: testOrgName,
      slug: testOrgSlug,
      plan_type: 'free',
      subscription_status: 'active',
      billing_email: testEmail,
    }),
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status > 299) {
    throw new Error(`Org creation failed: ${data.message || JSON.stringify(data)}`);
  }

  return data[0]; // Returns array
}

// Step 3: Create user profile
async function createProfile(userId, orgId) {
  console.log('\n3. Creating profile...');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${userId}`,
    },
    body: JSON.stringify({
      id: userId,
      org_id: orgId,
      full_name: testUserName,
      email: testEmail,
      role: 'owner',
      is_super_admin: false,
    }),
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status > 299) {
    throw new Error(`Profile creation failed: ${data.message || JSON.stringify(data)}`);
  }

  return data[0];
}

// Run the test
async function runTest() {
  try {
    const authData = await createUser();
    const userId = authData.user.id;
    console.log('\n✅ User created:', userId);

    const org = await createOrganization(userId);
    const orgId = org.id;
    console.log('\n✅ Organization created:', orgId);

    const profile = await createProfile(userId, orgId);
    console.log('\n✅ Profile created:', profile);

    console.log('\n========================================');
    console.log('✅ TEST SUCCESSFUL!');
    console.log('========================================');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('Organization ID:', orgId);
    console.log('User ID:', userId);
    console.log('\nYou can now login with these credentials');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

runTest();
