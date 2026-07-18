/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found.');
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
      value = value.replace(/^"|"/g, '');
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function cleanPhone(raw) {
  if (!raw) return '';
  return raw.replace(/[^\d+]/g, '');
}

// Function to compute quality score for a lead record
function getQualityScore(lead) {
  let score = 0;
  if (lead.call_status && lead.call_status !== 'pending') {
    score += 10;
  }
  if (lead.sale_status && lead.sale_status !== 'pending') {
    score += 10;
  }
  if (lead.notes && lead.notes.trim()) {
    score += 5;
  }
  if (lead.website && lead.website.trim() && lead.website !== '—') {
    score += 5;
  }
  return score;
}

async function run() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== DATABASE CLEANUP (${isExecute ? 'LIVE MODE' : 'DRY RUN'}) ===\n`);

  console.log('Fetching all leads from Supabase...');
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*');

  if (error) {
    console.error('Error fetching leads:', error.message);
    process.exit(1);
  }

  console.log(`Successfully fetched ${leads.length} leads.`);

  // Groups
  const phoneGroups = {};
  const urlGroups = {};

  leads.forEach(lead => {
    // Group by normalized phone
    if (lead.phone) {
      const clean = cleanPhone(lead.phone);
      if (clean) {
        const key = `${lead.city.trim().toLowerCase()}::${clean}`;
        if (!phoneGroups[key]) phoneGroups[key] = [];
        phoneGroups[key].push(lead);
      }
    }

    // Group by normalized maps url
    if (lead.google_maps_url) {
      const urlMatch = lead.google_maps_url.match(/cid=(\d+)/);
      const urlKey = urlMatch ? urlMatch[1] : lead.google_maps_url.trim().toLowerCase();
      if (urlKey) {
        if (!urlGroups[urlKey]) urlGroups[urlKey] = [];
        urlGroups[urlKey].push(lead);
      }
    }
  });

  const idsToDelete = new Set();
  const leadsToUpdate = [];

  // Helper to determine duplicates and select the best lead
  function processDuplicateGroup(group, groupType, groupKey) {
    if (group.length <= 1) return;

    // Filter out leads that are already marked for deletion in another pass
    const activeLeads = group.filter(l => !idsToDelete.has(l.id));
    if (activeLeads.length <= 1) return;

    // Sort by quality score (descending), then by age (oldest first)
    activeLeads.sort((a, b) => {
      const scoreA = getQualityScore(a);
      const scoreB = getQualityScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    const best = activeLeads[0];
    const duplicates = activeLeads.slice(1);

    console.log(`Duplicate Group [${groupType} - ${groupKey}]:`);
    console.log(`  KEEP: ID=${best.id}, Name="${best.name}", Status=${best.call_status}/${best.sale_status}, Score=${getQualityScore(best)}`);
    
    duplicates.forEach(dup => {
      idsToDelete.add(dup.id);
      console.log(`  DELETE: ID=${dup.id}, Name="${dup.name}", Status=${dup.call_status}/${dup.sale_status}, Score=${getQualityScore(dup)}`);
    });
  }

  // Pass 1: Deduplicate by Google Maps URL
  console.log('\n--- Pass 1: Checking Google Maps URL duplicates ---');
  for (const [key, group] of Object.entries(urlGroups)) {
    processDuplicateGroup(group, 'URL/CID', key);
  }

  // Pass 2: Deduplicate by City & Normalized Phone Number
  console.log('\n--- Pass 2: Checking City & Phone duplicates ---');
  for (const [key, group] of Object.entries(phoneGroups)) {
    processDuplicateGroup(group, 'Phone', key);
  }

  // Pass 3: Identify phone normalization updates
  console.log('\n--- Pass 3: Checking phone formatting updates ---');
  leads.forEach(lead => {
    // If it's slated for deletion, skip
    if (idsToDelete.has(lead.id)) return;

    const cleanP = cleanPhone(lead.phone || '');
    const cleanWA = cleanPhone(lead.whatsapp_number || '');

    const needsPhoneUpdate = lead.phone && lead.phone !== cleanP;
    const needsWAUpdate = lead.whatsapp_number && lead.whatsapp_number !== cleanWA;

    if (needsPhoneUpdate || needsWAUpdate) {
      leadsToUpdate.push({
        id: lead.id,
        name: lead.name,
        old_phone: lead.phone,
        new_phone: cleanP,
        old_wa: lead.whatsapp_number,
        new_wa: cleanWA
      });
    }
  });

  console.log(`\nFound ${leadsToUpdate.length} records that need phone format normalization.`);
  if (!isExecute && leadsToUpdate.length > 0) {
    leadsToUpdate.slice(0, 10).forEach(u => {
      console.log(`  - "${u.name}": "${u.old_phone}" -> "${u.new_phone}"`);
    });
    if (leadsToUpdate.length > 10) console.log(`  ... and ${leadsToUpdate.length - 10} more`);
  }

  console.log(`\nSummary:`);
  console.log(`- Leads to delete: ${idsToDelete.size}`);
  console.log(`- Leads to update: ${leadsToUpdate.length}`);

  if (isExecute) {
    // Perform updates
    if (leadsToUpdate.length > 0) {
      console.log('\nPerforming updates in Supabase...');
      for (const u of leadsToUpdate) {
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            phone: u.new_phone,
            whatsapp_number: u.new_wa
          })
          .eq('id', u.id);

        if (updateError) {
          console.error(`Failed to update ID=${u.id} (${u.name}):`, updateError.message);
        }
      }
      console.log('Updates complete.');
    }

    // Perform deletions
    if (idsToDelete.size > 0) {
      console.log('\nDeleting duplicate records from Supabase...');
      const idList = Array.from(idsToDelete);
      
      // Batch deletes in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < idList.length; i += chunkSize) {
        const chunk = idList.slice(i, i + chunkSize);
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .in('id', chunk);

        if (deleteError) {
          console.error(`Failed to delete chunk starting at index ${i}:`, deleteError.message);
        }
      }
      console.log('Deletions complete.');
    }

    console.log('\n=== Database cleanup finished successfully! ===');
  } else {
    console.log('\nTo apply these changes to the database, run:');
    console.log('  node scripts/clean_database.js --execute');
  }
}

run();
