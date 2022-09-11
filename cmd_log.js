const clc = require("cli-color");
//const Tail = require('always-tail');
const { runScript } = require('./rs');
const { formatL, getCurrentUser, getServiceList, getLogFolder } = require('./utils');

/**
 * Pipes output of 'cmd' bash script to console with 'name' prefix and colored by 'colorFunc' of cli-color
 */
async function tail(cmd, name, colorFunc) {
  let o = {
    stime : Date.now(),
  }
  await runScript(cmd, {
    onData: (data) => {
      let padding = (Date.now() - o.stime > 200 ? 20 : 10)
      data.split('\n').forEach( line => {
        if (line && line.indexOf('-- Logs begin at')===-1) console.log(colorFunc(formatL(name, padding) + " |"), line);
      })
    }
  });
}


/**
 * Get list of pid of all systemd processes
 */
async function systemdIds() {
  let res = await runScript(`ps aux | grep systemd`);
  res = res.lines.join('').split('\n')
  res = res
  .filter(i=>i.indexOf('systemd-journald')===-1 && i.indexOf('systemd-udevd')===-1 && i.indexOf('systemd-logind')===-1 && i.indexOf('dbus-daemon')===-1 && i.indexOf('grep')===-1&& i.indexOf('EXIT')===-1)
  .map(i=>{
    let p=i.indexOf(' ');
    return i.substring(p+1, i.length).trim().split(' ')[0];
  })
  return res;
}


async function log(serviceName) {
  let currentUser = await getCurrentUser();
  let logFolder = getLogFolder(currentUser);
  let serviceList = (serviceName ? [serviceName] : await getServiceList('pm2sd'));

  let ids = await systemdIds()
  let journalCmd = `journalctl ${' _PID='+ids.join(' _PID=')} -f`;

  let tname = (serviceName ? serviceName : 'all');
  console.log(clc.blackBright(`\n[TAILING] Tailing last 10 lines for [${tname}] processes`));
  console.log(clc.blackBright(`'${journalCmd}' last 10 lines (blue):`));
  serviceList.forEach( service => {
    let name = service.replace(/^pm2sd-/, '').replace(/.service$/, '');
    let fn = logFolder + 'pm2sd-'+name+'/output.log';
    console.log(clc.blackBright(`'${fn}' last 10 lines (green):`))
  })

  tail(journalCmd, 'systemd', clc.xterm(21))

  serviceList.forEach( service => {
    let name = service.replace(/^pm2sd-/, '').replace(/.service$/, '');
    let fn = logFolder + 'pm2sd-'+name+'/output.log';

    tail(`tail -f ${fn}`, name, clc.greenBright)
  }

/*
  let journal = await runScript(`journalctl | grep pm2sd | tail`);
  journal
  .lines
  .join('')
  .split('\n')
  .filter(i=>i.indexOf('EXIT')===-1)
  .forEach(line => {
    console.log(clc.xterm(21)(formatL('PM2SD', 10) + " |"), line);
  })

  let r = Promise.resolve();
  for (let i=0; i<serviceList.length; i++) {
//console.log('i=', i);
    let name = serviceList[i].replace(/^pm2sd-/, '').replace(/.service$/, '');
    let fn = logFolder + 'pm2sd-'+name+'/output.log';
//console.log('fn', fn);

    r = r
    .then(() => runScript(`tail ${fn}`))
    .then(logLines => {
      console.log(clc.blackBright(`\n${fn} last 10 lines:`));

      logLines
      .lines
      .join('')
      .split('\n')
      .filter(i=>i.indexOf('EXIT')===-1)
      .forEach(line => {
        console.log(clc.greenBright(formatL(name, 10) + " |"), line);
      })
    })
  }

  for (let i=0; i<serviceList.length; i++) {
    let name = serviceList[i].replace(/^pm2sd-/, '').replace(/.service$/, '');
    let fn = logFolder + 'pm2sd-'+name+'/output.log';

    r = r
    .then(() => {
      let tail = new Tail(fn, '\n');
      tail.on('line', (data) => console.log(clc.greenBright(formatL(name, 20) + " |"), data));
      tail.on('error', (data) => console.log(clc.redBright(formatL(name, 20) + " |"), data));
      tail.watch();
    })
  }

  return r.then(() => console.log(''));
*/
}


module.exports = log;