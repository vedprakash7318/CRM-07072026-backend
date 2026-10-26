import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), `backup_db_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Starting database backup to: ${backupDir}`);

  try {
    await mongoose.connect(process.env.DB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`Found ${collections.length} collections.`);

    for (const col of collections) {
      const colName = col.name;
      const filePath = path.join(backupDir, `${colName}.json`);
      console.log(`Backing up collection: ${colName}...`);

      const collection = db.collection(colName);
      const totalDocs = await collection.countDocuments();
      
      const fileStream = fs.createWriteStream(filePath, { encoding: 'utf-8' });
      fileStream.write('[\n');

      let isFirst = true;
      const cursor = collection.find({});

      for await (const doc of cursor) {
        if (!isFirst) {
          fileStream.write(',\n');
        } else {
          isFirst = false;
        }
        fileStream.write(JSON.stringify(doc));
      }

      fileStream.write('\n]');
      fileStream.end();

      await new Promise(resolve => fileStream.on('finish', resolve));
      console.log(`Saved ${totalDocs} documents to ${colName}.json`);
    }

    console.log('\nBackup completed successfully!');
    console.log(`All collections backed up at: ${backupDir}`);
  } catch (error) {
    console.error('Backup failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

backupDatabase();
