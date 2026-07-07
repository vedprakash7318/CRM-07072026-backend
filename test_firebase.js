import mongoose from 'mongoose';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import Employee from './models/employee.model.js';
import admin from './Firebase/firebaseAdmin.js';

dotenv.config();

connectDB().then(async () => {
  try {
    const employee = await Employee.findOne({ fcmToken: { $exists: true, $ne: null } });
    if (!employee) {
      console.log('No employee with fcmToken found.');
      process.exit(0);
    }
    
    console.log('Found employee:', employee.empName, 'Token:', employee.fcmToken);

    const result = await admin.messaging().send({
      token: employee.fcmToken,
      notification: {
        title: 'Test Title',
        body: 'Test Body',
      }
    });

    console.log('Firebase success:', result);
  } catch (e) {
    console.error('Firebase error:', e);
  } finally {
    process.exit(0);
  }
}).catch(console.error);
