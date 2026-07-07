import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { sendNotification } from './Firebase/sendNotification.js';

import dotenv from 'dotenv';
dotenv.config();

connectDB().then(async () => {
  const req = { body: { employeeId: '663d23d83cdb1f4df6d5c641', title: 'test', message: 'msg' } };
  const res = { 
    status: (c) => ({ json: (d) => console.log('RES:', c, d) }), 
    json: (d) => console.log('RES:', d) 
  };
  await sendNotification(req, res);
  process.exit(0);
}).catch(console.error);
