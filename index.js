const ls = process.platform === 'win32' ? require('./cmd_ls.win') : require('./cmd_ls');
const stop = require('./cmd_stop');
const start = require('./cmd_start');
const create = require('./cmd_create');
const op_delete = require('./cmd_delete');
const op_log = require('./cmd_log');
const { getServiceList, getCurrentUser } = require('./utils');

/**
 * Reads arguments,
 * so this 'node index.js op1 op2 --op3=333 op4 -err --op5="55 55"' becomes
 *  { cmd: ['op1', 'op2', 'op4'],
 *    opt: { op3: '333', op5: '55 55' },
 *    err: [ '-err' ]
 *  }
 */
const pargv = process.argv.slice(2);
let args = {opt:{}, err:[], cmd:[]}
for (var i=0; i<pargv.length; i++) {
  let o = pargv[i];
  if (o.startsWith('--')) {
    let p = o.indexOf('=');
    if (p===-1) p = o.length;
    let name = o.substring(2, p);
    let value = o.substring(p+1, o.length);
    args.opt[name] = value ? value : true;
  } else if (o.startsWith('-')) {
    args.err.push(o);
  } else {
    args.cmd.push(o);
  }
}

if (args.err.length > 0) {
  console.error('ERROR: unknown option' + (args.err.length>1?'s ':' ') + args.err.join(', '));
  return;
}

if (args.cmd[0] === 'ls') {
  if (args.opt['all']) {
     if (args.cmd.length > 1) {
       ls(args.cmd[1]);
     } else {
       ls();
     }
  } else {
    if (args.cmd.length > 1) {
      ls('pm2sd', 'pm2sd', args.cmd[1]);
    } else {
      ls('pm2sd', 'pm2sd');
    }
  }


} else if (args.cmd[0] === 'log') {
  if (args.cmd[1]) {
    op_log('pm2sd-' + args.cmd[1]).catch(err => console.error('ERROR', err))
  } else {
    op_log().catch(err => console.error('ERROR', err))
  }


} else if (args.cmd[0] === 'stop') {
  if (args.cmd[1]) {
    stop('pm2sd-' + args.cmd[1])
      .catch(err => console.error('ERROR', err))
      .finally(() => ls('pm2sd', 'pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "stop"');
  }


} else if (args.cmd[0] === 'restart') {
  if (args.cmd[1]) {
    let name = 'pm2sd-' + args.cmd[1];
    console.log(`Stoping service ${name}...`);
    stop(name, true)
     .then(()=>start(name))
     .catch(err => console.error('ERROR', err))
     .finally(() => ls('pm2sd', 'pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "restart"');
  }


} else if (args.cmd[0] === 'delete') {
  if (args.cmd[1]) {
    op_delete('pm2sd-' + args.cmd[1])
     .catch(err => console.error('ERROR', err))
     .finally(() => ls('pm2sd', 'pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "delete"');
  }


} else if (args.cmd[0] === 'start') {
  // only --name --user --description --time options
  let err = '';
  Object.keys(args.opt).forEach( key => {
    if (['name', 'user', 'description', 'time'].indexOf(key) === -1) 
      err = (err?'\n':'') + 'ERROR: unknown option ' + key;
  })
  if (err) {
    console.error(err);
    return;
  }

  if (args.cmd[1]) {
      getServiceList()
      .then( res => {
        let possibleName = 'pm2sd-' + args.cmd[1];
        if (res.indexOf(`${possibleName}.service`) !== -1) {
          // start existing service
          return start(possibleName)
           .catch(err => console.error('ERROR', err))
           .finally(() => ls('pm2sd', 'pm2sd'));
        } else {
          // or create new service
          if (args.cmd[1].endsWith('.js') || args.cmd[1].endsWith('.sh')) {
            // node.js app or bash script

            if (!args.opt.name) {
              possibleName = 'pm2sd-' + args.cmd[1].replace(/\.js$/, '').replace(/\.sh$/, '');
              if (res.indexOf(possibleName) === -1) {
                args.opt.name = possibleName;
              } else {
                args.opt.name = possibleName + rnd(10000, 99999);
              }
            }
            args.opt.name = (args.opt.name.startsWith('pm2sd-')?'':'pm2sd-') + args.opt.name;

            return create(args.cmd[1], args.opt)
             .catch(err => console.error('ERROR', err))
             .finally(() => ls('pm2sd', 'pm2sd'));
          } else {
            // whatever it was
            console.error('Cannot determine script type (only .js and .sh implemented).')
          }
        }
      })
  } else {
    console.error('ERROR: there is no filename after "start"');
  }

} else {
  console.log(`
    Usage: pm2sd <command> [name/filename] [options]

    Commands: ls|start|stop|restart|delete

    Options: --all
             --name
             --user
             --time
             --description
`);
}


function rnd(min,max) {
    return Math.floor((Math.random())*(max-min+1))+min;
}