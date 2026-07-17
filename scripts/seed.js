/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');


// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found. Please create it first.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.replace(/^"|Format"$/g, '');
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your_supabase') || supabaseAnonKey.includes('your_supabase')) {
  console.log('--- SUPABASE NOT CONFIGURED YET ---');
  console.log('Please replace the placeholder values in .env.local with your real Supabase URL and Anon Key.');
  console.log('You can find them in your Supabase Dashboard -> Settings -> API.');
  console.log('\nOnce updated, run this script again to seed different colored leads:');
  console.log('  node scripts/seed.js');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testLeads = [
  {
    name: 'Pizza Palace (Pending)',
    phone: '+15550192',
    whatsapp_number: '+15550192',
    google_maps_url: 'https://maps.google.com/?cid=111',
    address: '123 Cheese St',
    rating: 4.5,
    website: 'https://pizzapalace.example.com',
    city: 'TestCity',
    call_status: 'pending',
    sale_status: 'pending',
    notes: 'Freshly imported lead, not yet called.'
  },
  {
    name: 'Burger Bistro (Called & Free Trial)',
    phone: '+15550193',
    whatsapp_number: '+15550193',
    google_maps_url: 'https://maps.google.com/?cid=222',
    address: '456 Grill Rd',
    rating: 4.2,
    website: 'https://burgerbistro.example.com',
    city: 'TestCity',
    call_status: 'called',
    sale_status: 'free_trial',
    notes: 'Had a call, agreed to start a 14-day free trial.'
  },
  {
    name: 'Sushi Spot (Call Later & Proceed)',
    phone: '+15550194',
    whatsapp_number: '+15550194',
    google_maps_url: 'https://maps.google.com/?cid=333',
    address: '789 Fish Ave',
    rating: 4.8,
    website: 'https://sushispot.example.com',
    city: 'TestCity',
    call_status: 'call_later',
    sale_status: 'proceed',
    notes: 'Busy right now, asked to call back next Tuesday at 3 PM.'
  },
  {
    name: 'Taco Town (No Answer & Rejected)',
    phone: '+15550195',
    whatsapp_number: '+15550195',
    google_maps_url: 'https://maps.google.com/?cid=444',
    address: '321 Spice Blvd',
    rating: 3.9,
    website: 'https://tacotown.example.com',
    city: 'TestCity',
    call_status: 'no_answer',
    sale_status: 'rejected',
    notes: 'No response after 3 call attempts. Marking as dead lead.'
  },
  {
    name: 'Pasta Place (Called & Proceed)',
    phone: '+15550196',
    whatsapp_number: '+15550196',
    google_maps_url: 'https://maps.google.com/?cid=555',
    address: '654 Noodle Way',
    rating: 4.6,
    website: 'https://pastaplace.example.com',
    city: 'TestCity',
    call_status: 'called',
    sale_status: 'proceed',
    notes: 'Highly interested! Proceeding to setup implementation.'
  }
];

async function seed() {
  console.log('Seeding test leads into Supabase...');
  
  // Clear existing test leads for TestCity first to prevent duplicate bloat
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .eq('city', 'TestCity');

  if (deleteError) {
    console.error('Error clearing old test leads:', deleteError.message);
    console.log('Make sure leads table exists and RLS policies allow deletes/inserts.');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('leads')
    .insert(testLeads)
    .select();

  if (error) {
    console.error('Error seeding leads:', error.message);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data.length} leads with various statuses!`);
  console.log('Open http://localhost:3000/outreach and select "TestCity" to see the styled UI.');
}

seed();
