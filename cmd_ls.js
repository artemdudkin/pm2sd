var clc = require("cli-color");
const { runScript } = require('./rs');
const { loader, formatMem, formatL, printLs, getCurrentUser, getServiceList, getSystemServiceList } = require('./utils');


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
          if (typeof r.Loaded !== 'undefined') {
            result.push(r);

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
          }
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
  loader.on();
  try {
    let s = await getServiceList(name)
    let res = await getServiceListInfo(s, prefix)
    loader.off();
    printLs(res)
  } catch (err) {
    loader.off();
    console.log('ERROR', err)
  }
}


module.exports = ls;