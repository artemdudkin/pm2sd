const fs = require("fs");
const clc = require("cli-color");
const { runScript } = require('./rs');
const { formatL, getCurrentUser, getServiceList, getLogFolder } = require('./utils');

/**
 * Pipes output of 'cmd' bash script to console with 'name' prefix and colored by 'colorFunc' of cli-color
 */
async function tail(cmd, description, name, colorFunc) {
  let o = {
    stime : Date.now(),
    i:0
  }
  await runScript(cmd, {
    onData: (data) => {
      let padding = (Date.now() - o.stime > 200 ? 20 : 10)
      data.split('\n').forEach( line => {
        if (line && line.indexOf('-- Logs begin at')===-1) {
          if (o.i++ === 0) console.log(clc.blackBright(`\n'${description}' last 10 lines:`))
          console.log(colorFunc(formatL(name, padding) + " |"), line);
        }
      })
    }
  });
}


/**
 * Get list of pid of all systemd processes
 */
async function systemdIds() {
  let res = await runScript(`ps aux | grep "systemd "`);
  res = res.lines.join('').split('\n')
  res = res
  .filter(i=>i.indexOf('systemd-journald')===-1 && i.indexOf('systemd-udevd')===-1 && i.indexOf('systemd-logind')===-1 && i.indexOf('dbus-daemon')===-1 && i.indexOf('grep')===-1&& i.indexOf('EXIT')===-1&& i.indexOf('systemd-timesyncd')===-1&& i.indexOf('systemd-resolved')===-1&& i.indexOf('systemd-oomd')===-1&& i.indexOf('systemd-userdbd')===-1)
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

  let tname = (serviceName ? `[${serviceName}] process`: '[all] processes');
  console.log(clc.blackBright(`\n[TAILING] Tailing last 10 lines for ${tname}`));

  let ids = await systemdIds()
  let journalCmd = `journalctl ${' _PID='+ids.join(' _PID=')} -f`;
  tail(journalCmd, journalCmd, 'systemd', clc.xterm(21))

  serviceList.forEach( service => {
    let name = service.replace(/^pm2sd-/, '').replace(/.service$/, '');
    let fn = logFolder + 'pm2sd-'+name+'/output.log';

    if (!fs.existsSync(fn)) {
      console.log(clc.red(`\n'${fn}' does not exists. Cannot read log for 'pm2sd-${name}'.`))
    } else {
      tail(`tail -f ${fn}`, fn, name, clc.greenBright)
    }
  })
}


module.exports = log;