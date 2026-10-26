const fs = require('fs');
const path = require('path');

const files = [
  'corn/reminderCron.js',
  'corn/pendingLeadMorningCron.js',
  'corn/missedLeadCron.js',
  'controllers/lead.controller.js',
  'controllers/request.contoller.js',
  'Firebase/sendNotification.js'
];

files.forEach(f => {
  const filePath = path.join(__dirname, f);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace fcmToken: { $ne: null } -> fcmTokens: { $exists: true, $not: { $size: 0 } }
  content = content.replace(/fcmToken:\s*\{\s*\$ne:\s*null\s*\}/g, 'fcmTokens: { $exists: true, $not: { $size: 0 } }');
  
  // Replace admin.messaging().send({ token: emp.fcmToken -> admin.messaging().sendEachForMulticast({ tokens: emp.fcmTokens
  content = content.replace(/admin\.messaging\(\)\.send\(\{\s*token:\s*(emp|employee|removedEmp|isExistEmployee)\.fcmToken,/g, 'admin.messaging().sendEachForMulticast({ tokens: $1.fcmTokens,');
  
  // Replace if (emp?.fcmToken) -> if (emp?.fcmTokens && emp.fcmTokens.length > 0)
  content = content.replace(/if\s*\(\s*(emp|employee|removedEmp|isExistEmployee)\?\.fcmToken\s*\)/g, 'if ($1?.fcmTokens && $1.fcmTokens.length > 0)');

  // Replace hasFCMToken: !!employee?.fcmToken -> hasFCMToken: !!(employee?.fcmTokens && employee.fcmTokens.length > 0)
  content = content.replace(/hasFCMToken:\s*!!employee\?\.fcmToken/g, 'hasFCMToken: !!(employee?.fcmTokens && employee.fcmTokens.length > 0)');

  // Replace !employee.fcmToken -> (!employee.fcmTokens || employee.fcmTokens.length === 0)
  content = content.replace(/!employee\.fcmToken/g, '(!employee.fcmTokens || employee.fcmTokens.length === 0)');

  // Replace { fcmToken: null } -> { fcmTokens: [] }
  content = content.replace(/\{\s*fcmToken:\s*null\s*\}/g, '{ fcmTokens: [] }');

  // Replace token: emp.fcmToken (for cases missed by the above)
  content = content.replace(/token:\s*(emp|employee|removedEmp|isExistEmployee)\.fcmToken/g, 'tokens: $1.fcmTokens');

  fs.writeFileSync(filePath, content);
  console.log('Updated ' + f);
});
