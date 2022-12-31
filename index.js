const folder = process.platform === 'win32' ? 'src/windows' : 'src/linux';
const ls = require(`./${folder}/cmd_ls`);
const stop = require(`./${folder}/cmd_stop`);
const start = require(`./${folder}/cmd_start`);
const create = require(`./${folder}/cmd_create`);
const op_delete = require(`./${folder}/cmd_delete`);
const op_log = require(`./${folder}/cmd_log`);
const { getServiceList } = require(`./${folder}/utils.os`);
const { printError } = require('./src/utils');

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
       ls(args.cmd[1], undefined, undefined, args.opt['json']);
     } else {
       ls(undefined, undefined, undefined, args.opt['json']);
     }
  } else {
    if (args.cmd.length > 1) {
      ls('pm2sd', 'pm2sd', args.cmd[1], args.opt['json']);
    } else {
      ls('pm2sd', 'pm2sd', undefined, args.opt['json']);
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
      .catch(err => printError(err))
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
     .catch(err => printError(err))
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
        if (res.indexOf(possibleName) !== -1) {
          // start existing service
          return start(possibleName)
           .catch(err => printError(err))
           .finally(() => ls('pm2sd', 'pm2sd'));
        } else {
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
             .catch(err => printError(err))
             .finally(() => ls('pm2sd', 'pm2sd'));
        }
      })
      .catch(err => printError(err))
  } else {
    console.error('ERROR: there is no filename after "start"');
  }

} else if (args.opt['version']){
  console.log( require('./package.json').version);
} else {
  console.log(`
    Usage: pm2sd <command> [name/filename] [options]

    Commands: ls|start|stop|restart|delete

    Options: --all
             --json
             --name
             --user
             --time
             --description
             --version
`);
}


function rnd(min,max) {
    return Math.floor((Math.random())*(max-min+1))+min;
}