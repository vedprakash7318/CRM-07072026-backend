import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';

async function run() {
  try {
    await mongoose.connect(process.env.DB_URI);
    const TagParent = mongoose.model('TagParents', new mongoose.Schema({ tagParentName: String }));
    const Tag = mongoose.model('Tag', new mongoose.Schema({ tagName: String, parentId: mongoose.Schema.Types.ObjectId }));

    const parents = await TagParent.find().lean();
    console.log('All Tag Parents:');
    parents.forEach(p => console.log(`ID: ${p._id} | Name: ${p.tagParentName}`));

    const collegeParent = parents.find(p => p.tagParentName.toLowerCase().includes('college'));
    
    const allTags = await Tag.find().lean();
    console.log(`\nTotal tags: ${allTags.length}`);

    const collegeTagsById = allTags.filter(t => t.parentId && collegeParent && t.parentId.toString() === collegeParent._id.toString());
    console.log(`Tags linked to 'College' parentId: ${collegeTagsById.length}`);

    // Tags not linked to College parent:
    const nonCollegeTags = allTags.filter(t => !t.parentId || (collegeParent && t.parentId.toString() !== collegeParent._id.toString()));
    console.log('\n--- NON-COLLEGE TAGS ---');
    nonCollegeTags.forEach(t => {
      const parent = parents.find(p => t.parentId && p._id.toString() === t.parentId.toString());
      console.log(`- [${parent ? parent.tagParentName : 'No Parent'}] ${t.tagName}`);
    });

    console.log('\n--- COLLEGE TAGS COUNT ---');
    console.log(collegeTagsById.length);

    // Write all college tag names to a file for easy viewing / export
    const collegeNames = collegeTagsById.map(t => t.tagName.trim()).sort((a, b) => a.localeCompare(b));
    fs.writeFileSync('./college_tags_list.txt', collegeNames.join('\n'), 'utf-8');
    console.log(`Successfully written ${collegeNames.length} college tags to college_tags_list.txt`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
