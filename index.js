const { ls, ls_sys } = require('./ls');
const stop = require('./stop');
const start = require('./start');
const create = require('./create');
const op_delete = require('./delete');
const { getServiceList } = require('./utils');

const args = process.argv.slice(2);

if (args[0] === 'ls') {
  if (args[1]) {
     if (args[1] === '--system') {
       ls_sys();
     } else if (args[1] === '--all') {
       ls();
     } else if (args[1].startsWith('-')) {
       console.error('ERROR: unknown option ' + args[1]);
     } else {
       ls(args[1]);
     }
  } else {
    ls('pm2sd', 'pm2sd');
  }


} else if (args[0] === 'stop') {
  if (args[1]) {
    stop('pm2sd-' + args[1])
      .catch(err => console.log('ERROR', err))
      .finally(() => ls('pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "stop"');
  }


} else if (args[0] === 'restart') {
  if (args[1]) {
    let name = 'pm2sd-' + args[1];
    stop(name, true)
     .then(()=>start(name))
     .catch(err => console.log('ERROR', err))
     .finally(() => ls('pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "restart"');
  }


} else if (args[0] === 'delete') {
  if (args[1]) {
    op_delete('pm2sd-' + args[1])
     .catch(err => console.log('ERROR', err))
     .finally(() => ls('pm2sd'));
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
      let possibleName = 'pm2sd-' + args[1];
      getServiceList()
      .then( res => {
        if (res.indexOf(`${possibleName}.service`) !== -1) {
          return start(possibleName)
           .catch(err => console.log('ERROR', err))
           .finally(() => ls('pm2sd'));
        } else {
          if (!opt.name) opt.name = 'pm2sd-' + rnd(10000, 99999);
          return create(args[1], opt)
           .catch(err => console.log('ERROR', err))
           .finally(() => ls('pm2sd'));
        }
      })
    } else {
      console.error('ERROR: there is no filename after "start"');
    }
  }


} else {
  console.log('\n    Usage: pm2sd [ls|start|stop|restart|delete] [options]\n');
}


function rnd(min,max) {
    return Math.floor((Math.random())*(max-min+1))+min;
}