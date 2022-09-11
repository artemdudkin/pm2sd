var clc = require("cli-color");
const { runScript } = require('./rs');
const { formatL, getCurrentUser, getServiceList, getSystemServiceList } = require('./utils');


const loader_frames = ['-', '\\', '|', '/'];
let loader_index = 0;
let loader_timer = 0;

function loader_on(){
  loader_off();
  process.stdout.write('\u001B[?25l'); //hide cursor
  loader_timer = setInterval( () => {
    const frame = loader_frames[loader_index = ++loader_index % loader_frames.length];
    process.stdout.write(` ${frame}`);
    process.stdout.moveCursor(-2, 0)
  }, 200);
}
function loader_off(){
  process.stdout.write('\u001B[?25h'); //show cursor
  clearInterval(loader_timer);
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


function print(result) {
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


function processLines(lines, prefix) {
        lines = lines.join('').split('\n')
        let ret = {}
        lines.forEach(line => {
          let p = line.indexOf(':');
          if (p !== -1) {
            ret[line.substring(0, p).trim()] = line.substring(p+1, line.length).trim();
          }
        })

        let rname = (lines[0].split('.')[0].split(' ')[1] || '')
        if (prefix) rname = rname.replace(prefix+'-', '')
        rname = rname.trim();

        let rdescription = (lines[0].split(' - ')[1] || '');
        if (prefix) rdescription = rdescription.replace(prefix.toUpperCase(), '')
        rdescription = rdescription.trim();

        let r = {}
        r.name = rname;
        r.description = rdescription;
        r.active = (ret.Active || '').split(' ')[0];
        r.enabled = ((ret.Loaded || '').split(';')[1] || '').trim();
        r.uptime = ((ret.Active || '').split(';')[1] || '').replace('ago', '').trim();
        r.pid = (ret['Main PID'] || '').split(' ')[0];
        r.memory = ret['Memory'] || '';
        r.user = '';
        r.cpu = '';
        r.Loaded = ret.Loaded;

        return r;
}

/**
 * Get details for list of service names
 *
 * @param {Array} res - List of service names
 * @param {String} name - name of service (to cut out it from list)
 *
 * @returns [{name, description, active, enabled, uptime, pid, memory, user, cpu, Loaded}, ...]
 */
async function getServiceListInfo(res, prefix) {
    let currentUser = await getCurrentUser();

    let result = [];
    let r = Promise.resolve();

    res.forEach( serviceName => {
      r = r.then(() => {
        return runScript(`systemctl ${currentUser==='root'?'':'--user'} status ${serviceName}`)
        .then(res => {
          let r = processLines(res.lines, prefix);
          if (typeof r.Loaded !== 'undefined') result.push(r);

          return runScript(`ps -p ${r.pid} -o %cpu -o rss -o user`)
          .then(res => {
            let d = (res.lines.join('').split('\n')[1] || '').trim();
            let p = d.indexOf(' ');
            r.cpu = d.substring(0, p).trim();

            d = d.substring(p+1, d.length).trim()
            p = d.indexOf(' ');
            r.memory = formatMem(d.substring(0, p).trim());

            r.user = d.substring(p+1, d.length).trim();
          })
          .catch(err => {})
        })
        .catch(res => {
          let r = processLines(res.lines, prefix);
          if (typeof r.Loaded !== 'undefined') result.push(r);
        });
      })
    })

    return r.then(()=>{
      return result;
    })
}

async function ls(name, prefix) {
  loader_on();
  try {
    let s = await getServiceList(name)
    let res = await getServiceListInfo(s, prefix)
    loader_off();
    print(res)
  } catch (err) {
    loader_off();
    console.log('ERROR', err)
  }
}

async function ls_sys(name, prefix) {
  try {
    let s = getSystemServiceList(name)
    let res =getServiceListInfo(s, prefix)
    print(res)
  } catch (err) {
    console.log('ERROR', err);
  }
}



module.exports = { getServiceListInfo, ls, ls_sys };