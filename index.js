const { ls } = require('./ls');
const stop = require('./stop');
const start = require('./start');
const restart = require('./restart');
const op_delete = require('./delete');

const args = process.argv.slice(2);

if (args[0] === 'ls') {
  if (args[1]) {
     if (args[1] === '--all') {
       ls();
     } else if (args[1].startsWith('-')) {
       console.error('ERROR: unknown option ' + args[1]);
     } else {
       ls(args[1]);
     }
  } else {
    ls('pm2sd');
  }


} else if (args[0] === 'stop') {
  if (args[1]) {
    stop('pm2sd-' + args[1]).finally(() => ls('pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "stop"');
  }


} else if (args[0] === 'restart') {
  if (args[1]) {
    restart('pm2sd-' + args[1]).finally(() => ls('pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "restart"');
  }


} else if (args[0] === 'delete') {
  if (args[1]) {
    op_delete('pm2sd-' + args[1]).finally(() => ls('pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "delete"');
  }


} else if (args[0] === 'start') {
  let opt = {}
  args.slice(2).forEach(o => {
    if (opt) {
      if (o.startsWith('--')) {
        let p = o.indexOf('=');
        if (p===-1) p = o.length;
        let name = o.substring(2, p);
        if (['name', 'user', 'description'].indexOf(name) === -1) {
          console.error('ERROR: unknown option ' + name);
        } else {
          opt[name] = (name==='name'?'pm2sd-':'') + o.substring(p+1, o.length);
        }
      } else {
        console.error('ERROR: unknown option ' + o);
        opt = undefined;
      }
    }
  })
  if (opt) {
    if (args[1]) {
      start(args[1], opt).then(() => ls('pm2sd')).catch(err => {console.log(err)});
    } else {
      console.error('ERROR: there is no filename after "start"');
    }
  }


} else {
  console.log('\n    Usage: pm2sd [ls|start|stop|restart|delete] [options]\n');
}

