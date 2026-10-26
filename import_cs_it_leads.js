import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

// Models
import Lead from './models/lead.model.js';
import Tag from './models/tag.modal.js';
import TagParent from './models/tagParent.model.js';
import Priority from './models/priority.model.js';
import LeadSources from './models/leadSources.model.js';
import LeadStatus from './models/leadStatus.model.js';

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/amp/g, 'and')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPhone(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/\D/g, '').trim();
  if (p.length > 10 && p.startsWith('91')) {
    p = p.slice(2);
  }
  return p;
}

async function runImport() {
  console.log('=== Starting CS_IT_By_College Lead Import ===\n');

  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB database.');

    // 1. Fixed Configuration & Reference IDs
    const ADMIN_ID = new mongoose.Types.ObjectId('67e7d02fb0e3a9a66d377e7c'); // DigiCoders
    const COLLEGE_PARENT_ID = new mongoose.Types.ObjectId('6a37b4c7737741e72775f048');
    const BRANCH_PARENT_ID = new mongoose.Types.ObjectId('6a37b4d3737741e72775f050');
    const YEAR_PARENT_ID = new mongoose.Types.ObjectId('6a37b4cb737741e72775f04c');

    const YEAR_TAG_ID = new mongoose.Types.ObjectId('6adee728d5ffc189939bba6c'); // 3rd Year in 2026 (5th sem)
    const SOURCE_ID = new mongoose.Types.ObjectId('6a37b524737741e72775f06b'); // Excel Data
    const PRIORITY_ID = new mongoose.Types.ObjectId('6a37b4e5737741e72775f05a'); // High
    const LEAD_STATUS_ID = new mongoose.Types.ObjectId('67ea41743114b46b74cd921b'); // New

    console.log('Configuration verified:');
    console.log(`- Year Tag ID: ${YEAR_TAG_ID} ("3rd Year in 2026 (5th sem)")`);
    console.log(`- Source ID: ${SOURCE_ID} ("Excel Data")`);
    console.log(`- Priority ID: ${PRIORITY_ID} ("High")`);
    console.log(`- Lead Status ID: ${LEAD_STATUS_ID} ("New")`);
    console.log(`- Admin Owner: ${ADMIN_ID}\n`);

    // 2. Setup Branch Tags Mapping
    console.log('Fetching branch tags...');
    const existingBranchTags = await Tag.find({ parentId: BRANCH_PARENT_ID }).lean();
    const branchMap = new Map();

    existingBranchTags.forEach(t => {
      branchMap.set(normalizeText(t.tagName), t._id);
    });

    // Helper to get or create branch tag
    async function getOrCreateBranchTag(branchName) {
      const norm = normalizeText(branchName);

      // Explicit mappings for known variations
      if (norm.includes('computer science')) {
        const csId = branchMap.get(normalizeText('Computer Science'));
        if (csId) return csId;
      }
      if (norm.includes('information technology')) {
        const itId = branchMap.get(normalizeText('Information Technology'));
        if (itId) return itId;
      }
      if (norm.includes('pgdca') || norm.includes('diploma in computer application')) {
        const pgdcaId = branchMap.get(normalizeText('PGDCA'));
        if (pgdcaId) return pgdcaId;
      }

      if (branchMap.has(norm)) {
        return branchMap.get(norm);
      }

      // Create new branch tag if missing
      console.log(`Creating new Branch tag: "${branchName}"`);
      const newTag = await Tag.create({
        tagName: branchName.trim(),
        parentId: BRANCH_PARENT_ID,
        addedBy: ADMIN_ID,
        addedByType: 'Admin'
      });
      branchMap.set(norm, newTag._id);
      return newTag._id;
    }

    // 3. Setup College Tags Mapping
    console.log('Fetching college tags...');
    const existingCollegeTags = await Tag.find({ parentId: COLLEGE_PARENT_ID }).lean();
    const collegeMap = new Map();

    existingCollegeTags.forEach(t => {
      collegeMap.set(normalizeText(t.tagName), t._id);
    });

    async function getOrCreateCollegeTag(collegeName) {
      const trimmed = collegeName.trim();
      const norm = normalizeText(trimmed);

      if (collegeMap.has(norm)) {
        return collegeMap.get(norm);
      }

      // Check substring match
      for (const [key, id] of collegeMap.entries()) {
        if (key === norm || (key.length > 20 && norm.includes(key)) || (norm.length > 20 && key.includes(norm))) {
          return id;
        }
      }

      // If not found, create new College tag
      console.log(`Creating new College tag: "${trimmed}"`);
      const newTag = await Tag.create({
        tagName: trimmed,
        parentId: COLLEGE_PARENT_ID,
        addedBy: ADMIN_ID,
        addedByType: 'Admin'
      });
      collegeMap.set(norm, newTag._id);
      return newTag._id;
    }

    // 4. Pre-fetch all existing phone numbers in DB
    console.log('Fetching existing leads phones from DB to prevent duplicate errors...');
    const existingLeads = await Lead.find({}, 'phone').lean();
    const dbPhoneMap = new Map(); // phone -> leadId
    existingLeads.forEach(l => {
      if (l.phone) {
        dbPhoneMap.set(String(l.phone).trim(), l._id);
      }
    });
    console.log(`Found ${dbPhoneMap.size} unique phones currently in DB.\n`);

    // 5. Read all Excel files
    const dir = path.join(process.cwd(), 'CS_IT_By_College');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
    console.log(`Found ${files.length} Excel files in ${dir}.\n`);

    let totalRowsProcessed = 0;
    let leadsToInsert = [];
    const seenPhonesInBatch = new Set();
    let duplicatesInExcel = 0;
    let alreadyInDbCount = 0;
    let updatedExistingLeadsCount = 0;
    let invalidPhonesCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(dir, file);
      
      const wb = xlsx.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) continue;

      // College name for this file
      const fileCollegeName = rows[0]['College Name'] 
        ? String(rows[0]['College Name']).trim() 
        : file.replace('.xlsx', '').trim();

      const collegeTagId = await getOrCreateCollegeTag(fileCollegeName);

      for (const row of rows) {
        totalRowsProcessed++;

        const name = (row.Name || 'NA').toString().trim();
        const phone = cleanPhone(row['Phone Number']);
        const branchName = (row.Branch || 'COMPUTER SCIENCE AND ENGINEERING').toString().trim();
        const district = (row.District || '').toString().trim();

        if (!phone || phone.length < 9) {
          invalidPhonesCount++;
          continue;
        }

        const branchTagId = await getOrCreateBranchTag(branchName);
        const tagsArray = [collegeTagId, branchTagId, YEAR_TAG_ID];

        // Check if phone already exists in DB
        if (dbPhoneMap.has(phone)) {
          alreadyInDbCount++;
          const existingLeadId = dbPhoneMap.get(phone);
          // Add the new tags to the existing lead so it's tagged properly
          await Lead.updateOne(
            { _id: existingLeadId },
            { $addToSet: { tags: { $each: tagsArray } } }
          );
          updatedExistingLeadsCount++;
          continue;
        }

        // Check if duplicate within current import
        if (seenPhonesInBatch.has(phone)) {
          duplicatesInExcel++;
          continue;
        }

        seenPhonesInBatch.add(phone);

        leadsToInsert.push({
          name: name,
          phone: phone,
          tags: tagsArray,
          sources: SOURCE_ID,
          priority: PRIORITY_ID,
          leadStatus: LEAD_STATUS_ID,
          addedBy: ADMIN_ID,
          addedByType: 'Admin',
          deleted: false,
          closed: false,
          negative: false
        });
      }

      if ((i + 1) % 25 === 0 || i === files.length - 1) {
        console.log(`Processed ${i + 1}/${files.length} files... (Pending inserts: ${leadsToInsert.length})`);
      }
    }

    console.log(`\nAll files parsed!`);
    console.log(`Total rows scanned: ${totalRowsProcessed}`);
    console.log(`New unique leads ready to insert: ${leadsToInsert.length}`);
    console.log(`Already in DB (tags updated): ${alreadyInDbCount}`);
    console.log(`Duplicate phones in Excel files: ${duplicatesInExcel}`);
    console.log(`Invalid phones: ${invalidPhonesCount}\n`);

    // 6. Bulk Insert in Chunks of 500
    const CHUNK_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < leadsToInsert.length; i += CHUNK_SIZE) {
      const chunk = leadsToInsert.slice(i, i + CHUNK_SIZE);
      const res = await Lead.insertMany(chunk, { ordered: false });
      totalInserted += res.length;
      console.log(`Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${totalInserted}/${leadsToInsert.length})`);
    }

    console.log('\n=============================================');
    console.log('=== LEAD IMPORT COMPLETED SUCCESSFULLY! ===');
    console.log(`- Total Excel Files: ${files.length}`);
    console.log(`- Total Excel Rows: ${totalRowsProcessed}`);
    console.log(`- New Leads Successfully Inserted: ${totalInserted}`);
    console.log(`- Existing Leads Updated With Tags: ${updatedExistingLeadsCount}`);
    console.log(`- Duplicates Handled: ${duplicatesInExcel}`);
    console.log('=============================================\n');

  } catch (error) {
    console.error('Error during lead import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runImport();
