const ls = process.platform === 'win32' ? require('./cmd_ls.win') : require('./cmd_ls');
const stop = require('./cmd_stop');
const start = require('./cmd_start');
const create = require('./cmd_create');
const op_delete = require('./cmd_delete');
const op_log = require('./cmd_log');
const { getServiceList } = require('./utils');

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
    ls('pm2sd', 'pm2sd');
  }


} else if (args[0] === 'log') {
  if (args[1]) {
    op_log('pm2sd-' + args[1]).catch(err => console.error('ERROR', err))
  } else {
    op_log().catch(err => console.error('ERROR', err))
  }


} else if (args[0] === 'stop') {
  if (args[1]) {
    stop('pm2sd-' + args[1])
      .catch(err => console.error('ERROR', err))
      .finally(() => ls('pm2sd', 'pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "stop"');
  }


} else if (args[0] === 'restart') {
  if (args[1]) {
    let name = 'pm2sd-' + args[1];
    console.log(`Stoping service ${name}...`);
    stop(name, true)
     .then(()=>start(name))
     .catch(err => console.error('ERROR', err))
     .finally(() => ls('pm2sd', 'pm2sd'));
  } else {
    console.error('ERROR: there is no service name after "restart"');
  }


} else if (args[0] === 'delete') {
  if (args[1]) {
    op_delete('pm2sd-' + args[1])
     .catch(err => console.error('ERROR', err))
     .finally(() => ls('pm2sd', 'pm2sd'));
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
        if (['name', 'user', 'description', 'time'].indexOf(name) === -1) {
          console.error('ERROR: unknown option ' + name);
        } else {
          let value = o.substring(p+1, o.length);
          if (name==='name' && value) value='pm2sd-'+value;
          opt[name] = value ? value : true;
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
           .catch(err => console.error('ERROR', err))
           .finally(() => ls('pm2sd', 'pm2sd'));
        } else {
          if (!opt.name) opt.name = 'pm2sd-' + rnd(10000, 99999);
          return create(args[1], opt)
           .catch(err => console.error('ERROR', err))
           .finally(() => ls('pm2sd', 'pm2sd'));
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