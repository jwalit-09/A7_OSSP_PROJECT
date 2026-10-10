import { callAdapter } from './src/shellforge.js';

callAdapter('list', [''])
  .then(data => {
    console.log('✅ Adapter call succeeded from Windows Node!');
    console.log('Entries found:', data.length);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Adapter call failed:', err);
    process.exit(1);
  });
