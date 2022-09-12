const os = require('os');
var clc = require("cli-color");
const { runScript } = require('./rs');


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


/**
 * @param {Object} result [{name, active, enabled, uptime, pid, memory, user, cpu}, ...]
 */
function printLs(result) {
  let header = clc.blackBright(`┌──────────────────────┬──────────┬────────┬───────────┬───────────┬──────────┬──────────┬──────────┐\n`)+
               clc.blackBright(`│ `+clc.cyanBright(`name`)+`                 │ `+clc.cyanBright(`pid`)+`      │ `+clc.cyanBright(`uptime`)+` │ `+clc.cyanBright(`status`)+`    │ `+clc.cyanBright(`startup`)+`   │ `+clc.cyanBright(`%cpu`)+`     │ `+clc.cyanBright(`mem`)+`      │ `+clc.cyanBright(`user`)+`     │\n`)
  let header2= clc.blackBright(`├──────────────────────┼──────────┼────────┼───────────┼───────────┼──────────┼──────────┼──────────┤`);
  let footer = clc.blackBright(`└──────────────────────┴──────────┴────────┴───────────┴───────────┴──────────┴──────────┴──────────┘`);

  console.log(header + (result.length>0 ? header2 : '') + (result.length==0 ? footer : ''));

  result.map( line => {
    let { name='', pid='', uptime='', active='', enabled='', memory='', user='', cpu='' } = line;
    name = formatL( name, 20);
    pid  = formatL( pid, 8); 
    uptime  = formatL( uptime.replace(' days', 'D').replace(' day', 'D').replace('min', 'm').replace(' weeks', 'W'), 6);
    let status = active==='active' ? clc.green('active   ') : clc.red(formatL(active, 9));
    enabled = enabled==='enabled' ? clc.green('enabled  ') : enabled.trim().length===0 ? clc.red(formatL('?', 9)) : clc.red(formatL(enabled, 9));
    let mem = formatL( memory.replace('M', 'mb'), 8);
    user = formatL(user, 8);
    cpu = formatL(cpu, 8);

    if (active!=='active') pid = clc.red(pid);
    if (active!=='active') uptime = clc.red(uptime);

    let bb = clc.blackBright('│');
    console.log(`${bb} ${name} ${bb} ${pid} ${bb} ${uptime} ${bb} ${status} ${bb} ${enabled} ${bb} ${cpu} ${bb} ${mem} ${bb} ${user} ${bb}`);
  })
  if (result.length>0) console.log(footer);
}


function formatMem( mem) {
  if (mem < 1000) {
    return mem+'kb'
  } else if (mem < 1000000) {
    return Math.round(mem/100)/10+'mb'
  } else {
    return Math.round(mem/100000)/10+'gb'
  }
}


function formatL( s, len) {
  s = '' + (s || '');
  if (s.length > len) s = s.substring(0, len-1) +  '\u0324';
  if (s.length < len) s = s + Array(len+1-s.length).join(' ');
  return s;
}


let currentUser;
async function getCurrentUser() {
  if (!currentUser) { // memoization of current user
    let whoami = await runScript('whoami');
    currentUser = whoami.lines.join('').split('\n')[0];
  } else {
  }
  return currentUser;
}


/**
 * Returns array of service names from 'systemctl list-unit-files'
 * (also filter by name if any)
 */
async function getServiceList(name) {
  let currentUser = await getCurrentUser();

  return runScript(`systemctl ${currentUser==='root'?'':'--user'} list-unit-files --type=service`)
    .then(res => {
//console.log('res', res);
      let r = res.lines.join('')
                       .split('\n')
                       .filter(i=>i.indexOf('EXIT')!==0 && i.indexOf('UNIT')!==0 && i.indexOf('files listed.')===-1 )
                       .filter(i=>{
                         let type = i.substring(i.indexOf(' '), i.length).trim();
                         return type !=='static' && type !== ''
                       })
                       .map(i=>i.split(' ')[0].trim())

      return r.filter(i=>i.indexOf('.service')!==-1)
              .filter(i=>(name ? i.indexOf(name)!==-1 : true))
              .sort();
    })
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
  formatMem,
  formatL,
  printLs,

  getCurrentUser,
  getServiceList,

  getScriptFolder,
  getLogFolder,
  getServiceFolder
};