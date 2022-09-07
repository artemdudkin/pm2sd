const ls = require('./ls');

const args = process.argv.slice(2);

if (args[0] === 'ls') {
  if (args[1]) {
     if (args[1] === '--all') {
       ls();
     } else {
       console.log('ERROR: unknown option ' + args[1]);
     }
  } else {
    ls('pm2d');
  }
} else {
  console.log('\n    Usage: pm2d ls [options]\n');
}

