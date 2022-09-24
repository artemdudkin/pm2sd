const os = require('os');
var clc = require("cli-color");
const { getServiceList, getCurrentUser } = require('./utils.servicelist');


const loader = {
  frames : ['-', '\\', '|', '/'],
  index  : 0,
  timer  : 0,
  on : function() {
    loader.off();
    if (process.stdout.moveCursor) {
      process.stdout.write('\u001B[?25l'); //hide cursor
      loader.timer = setInterval( () => {
        const frame = loader.frames[loader.index = ++loader.index % loader.frames.length];
        process.stdout.write(` ${frame}`);
        process.stdout.moveCursor(-2, 0)
      }, 200);
    }
  },
  off: function() {
    clearInterval(loader.timer);
    loader.index = 0;
    loader.timer = undefined;
    if (process.stdout.moveCursor) process.stdout.write('\u001B[?25h'); //show cursor
  }
}



function relativeTime(timestamp) {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  let elapsed = Date.now() - timestamp;

  const sign = elapsed > 0 ? '' : '-';

  elapsed = Math.abs(elapsed);

  if (elapsed < msPerMinute) {
    return sign + Math.floor(elapsed / 1000) + "s";
  } else if (elapsed < msPerHour) {
    return sign + Math.floor(elapsed / msPerMinute) + "min";
  } else if (elapsed < msPerDay) {
    return sign + Math.floor(elapsed / msPerHour) + "h " + Math.floor(elapsed % msPerHour / msPerMinute) + 'min';
  } else if (elapsed < msPerMonth) {
    return sign + Math.floor(elapsed / msPerDay) + "D " + Math.floor(elapsed % msPerDay / msPerHour) + 'h';
  } else if (elapsed < msPerYear) {
    return sign + Math.floor(elapsed / msPerMonth) + "M " + Math.floor(elapsed % msPerMonth / msPerDay) + 'D';
  } else {
    return sign + Math.floor(elapsed / msPerYear) + "Y " + Math.floor(elapsed % msPerYear / msPerMonth) + 'M';
  }
}


/**
 * @param {Object} result [{name, active, enabled, uptime, pid, memory, user, cpu}, ...]
 */
function printLs(result) {
  let header = clc.blackBright(`┌──────────────────────┬──────────┬────────┬────────────┬───────────┬──────────┬──────────┬──────────┐\n`)+
               clc.blackBright(`│ `+clc.cyanBright(`name`)+`                 │ `+clc.cyanBright(`pid`)+`      │ `+clc.cyanBright(`uptime`)+` │ `+clc.cyanBright(`status`)+`     │ `+clc.cyanBright(`startup`)+`   │ `+clc.cyanBright(`%cpu`)+`     │ `+clc.cyanBright(`mem`)+`      │ `+clc.cyanBright(`user`)+`     │\n`)
  let header2= clc.blackBright(`├──────────────────────┼──────────┼────────┼────────────┼───────────┼──────────┼──────────┼──────────┤`);
  let footer = clc.blackBright(`└──────────────────────┴──────────┴────────┴────────────┴───────────┴──────────┴──────────┴──────────┘`);

  console.log(header + (result.length>0 ? header2 : '') + (result.length==0 ? footer : ''));

  result.map( line => {
    let { name='', pid='', uptime='', active='', enabled='', memory='', user='', cpu='' } = line;
    name = formatL( name, 20);
    pid  = formatL( pid, 8); 
    uptime  = formatL( uptime.replace(' days', 'D').replace(' day', 'D').replace('min', 'm').replace(' weeks', 'W').replace(' week', 'W'), 6);
    let status = (active==='active' || active==='RUNNING' ? clc.green : clc.red)(formatL(active, 10));
    enabled = enabled==='enabled' ? clc.green('enabled  ') : enabled.trim().length===0 ? clc.red(formatL('?', 9)) : clc.red(formatL(enabled, 9));
    let mem = formatL( memory.replace('M', 'mb'), 8);
    user = formatL(user, 8);
    cpu = formatL(memory ? cpu : '', 8);

    if (active!=='active' && active!=='RUNNING') pid = clc.red(pid);
    if (active!=='active' && active!=='RUNNING' ) uptime = clc.red(uptime);

    let bb = clc.blackBright('│');
    console.log(`${bb} ${name} ${bb} ${pid} ${bb} ${uptime} ${bb} ${status} ${bb} ${enabled} ${bb} ${cpu} ${bb} ${mem} ${bb} ${user} ${bb}`);
  })
  if (result.length>0) console.log(footer);
}


function formatMem( mem) {
  if (typeof mem === 'undefined') {
    return mem;
  }

  if (mem < 100) {
    return mem+'kb'
  } else if (mem < 1000000) {
    return Math.round(mem/100)/10+'mb'
  } else {
    return Math.round(mem/100000)/10+'gb'
  }
}


function formatL( s, len) {
  s = '' + (typeof s === 'undefined' ? '' : s);
  if (s.length > len) s = s.substring(0, len-1) +  '\u0324';
  if (s.length < len) s = s + Array(len+1-s.length).join(' ');
  return s;
}


function getScriptFolder(user) {
 return ( user === 'root' ? '/usr/sbin/' : `${os.homedir()}/bin/`);
}

function getLogFolder(user) {
  return (user === 'root' ? '/var/log/' : `${os.homedir()}/log/`);
}

function getServiceFolder(user) {
  return (user === 'root' ? '/etc/systemd/system/' : `${os.homedir()}/.config/systemd/user/`);
}



module.exports = {
  loader,
  relativeTime,
  formatMem,
  formatL,
  printLs,

  getCurrentUser,
  getServiceList,

  getScriptFolder,
  getLogFolder,
  getServiceFolder
};