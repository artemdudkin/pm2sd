const ls = require('./ls');
const stop = require('./stop');

const args = process.argv.slice(2);

if (args[0] === 'ls') {
  if (args[1]) {
     if (args[1] === '--all') {
       ls();
     } else {
       console.error('ERROR: unknown option ' + args[1]);
     }
  } else {
    ls('pm2d');
  }
} else if (args[0] === 'stop') {
  if (args[1]) {
    stop('pm2d-' + args[1]).finally(() => {
      ls('pm2d');
    });
  } else {
    console.error('ERROR: there is no service name after "stop"');
  }
} else {
  console.log('\n    Usage: pm2d ls [options]\n');
}

