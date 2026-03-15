// fix-request-detail.mjs — Run with: node fix-request-detail.mjs
import { readFileSync, writeFileSync } from 'fs';

const file = 'C:\\Users\\renat\\source\\repos\\ola-jamal\\frontend-web\\src\\pages\\doctor\\DoctorRequestDetail.tsx';
let c = readFileSync(file, 'utf8');

// 1. Insert reqType variable after statusInfo line
c = c.replace(
  '  const statusInfo = getStatusInfo(request.status);\n  const Icon = getTypeIcon(request.type);',
  `  const statusInfo = getStatusInfo(request.status);
  const reqType = (request.type || (request as unknown as Record<string, unknown>).requestType as string || '').toLowerCase();
  const Icon = getTypeIcon(reqType);`
);

// 2. Replace all request.type comparisons (but NOT data.type in the reqType definition line)
c = c.replace(/request\.type === 'consultation'/g, "reqType === 'consultation'");
c = c.replace(/request\.type !== 'consultation'/g, "reqType !== 'consultation'");

// 3. Replace getTypeLabel
c = c.replace('{getTypeLabel(request.type)}', '{getTypeLabel(reqType)}');

// 4. Replace StatusTracker type prop
c = c.replace(
  'type={request.type || (request as { requestType?: string }).requestType}',
  'type={reqType || (request as { requestType?: string }).requestType}'
);

// 5. Replace AssistantBanner requestType prop
c = c.replace('requestType={request.type}', 'requestType={reqType}');

// 6. Fix the useEffect that checks data.type for care plan loading
c = c.replace(
  "if (data.type === 'consultation') {",
  "if ((data.type || (data as unknown as Record<string, unknown>).requestType as string || '').toLowerCase() === 'consultation') {"
);

writeFileSync(file, c, 'utf8');
console.log('DoctorRequestDetail.tsx fixed!');

// Verify
const verify = readFileSync(file, 'utf8');
const reqTypeCount = (verify.match(/reqType/g) || []).length;
const oldCount = (verify.match(/request\.type/g) || []).length;
console.log(`reqType occurrences: ${reqTypeCount} (expected ~11)`);
console.log(`request.type remaining: ${oldCount} (expected 1 - in reqType definition)`);
