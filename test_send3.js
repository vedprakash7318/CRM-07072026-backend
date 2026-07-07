import mongoose from 'mongoose';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import { sendNotification } from './Firebase/sendNotification.js';

dotenv.config();

connectDB().then(async () => {
  try {
    const req = {
      body: {
        employeeId: '66a1efbc96bc24a141b2123f', // Aditya Kashyap's ID or similar, wait I don't know it. Let me fetch one.
      }
    };
    
    // fetch an employee with fcmToken
    const Employee = (await import('./models/employee.model.js')).default;
    const emp = await Employee.findOne({ fcmToken: { $exists: true, $ne: null } });
    req.body.employeeId = emp._id.toString();
    req.body.title = 'Test';
    req.body.message = 'Test msg';

    const res = {
      status: (c) => ({ json: (d) => console.log('RES STATUS:', c, d) }),
      json: (d) => console.log('RES JSON:', d)
    };

    await sendNotification(req, res);
  } catch (e) {
    console.error('Script error:', e);
  } finally {
    process.exit(0);
  }
}).catch(console.error);
