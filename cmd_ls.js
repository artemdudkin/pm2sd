var clc = require("cli-color");
const { runScript } = require('./rs');
const { loader, formatMem, formatL, printLs, getCurrentUser, getServiceList } = require('./utils');


function processLines(lines, prefix) {
        lines = lines.join('').split('\n')

        // split lines to get key-value according with template "key:value"
        // (and try to read list of children pids under CGroup line before empty line)
        let ret = {}
        let empty_line_passed = false;
        let cgroup_line_passed = false;
        for (let i=0; i<lines.length; i++){
          let line = lines[i];
          let p = line.indexOf(':');
          let name = (p !== -1 && p<13? line.substring(0, p).trim() : '')
          if (p !== -1 && p<13) {
            ret[name] = line.substring(p+1, line.length).trim();
          } else {
            if (cgroup_line_passed && !empty_line_passed) {
              let pdigit = -1;
              const matches = [...line.matchAll(/[0-9]/g)];
              if (matches.length) pdigit = matches.at(0).index;
              if (pdigit !== -1) {
                let pspace = line.indexOf(' ', pdigit);
                if (pspace !== -1) {
                  if (!ret.children) ret.children = []
                  ret.children.push( line.substring(pdigit, pspace));
                }
              }
            }
          }
          if (line.length === 0) empty_line_passed = true;
          if (name.toLowerCase() === 'cgroup') cgroup_line_passed = true;
        }

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
        r.children = ret.children;
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
          let l = processLines(res.lines, prefix);
          if (typeof l.Loaded !== 'undefined' && l.enabled!='static') result.push(l);
        })
        .catch(res => {
          let l = processLines(res.lines, prefix);
          if (typeof l.Loaded !== 'undefined' && l.enabled!='static') result.push(l);
        });
      })
    })
 
    let pidInfo = [];

    r = r.then(() => {
            let pids = result.filter(p=>!!p.pid).map(p=>p.pid) // get all pids
                       .concat( 
                       result.filter(p=>!!p.children).map(p=>p.children).flat()
                       ) //and all pids of childrens
            pids = [...new Set(pids)];

            return runScript(`ps -p ${pids.join(',')} -o %cpu -o rss -o user -o pid`)
            .then(res => {
              res.lines.join('').split('\n').slice(1).filter(l=>!l.startsWith('EXIT')).forEach( line => {
                let pi = {};

                line = line.trim();
                let p = line.indexOf(' '); if (p==-1) p=line.length;
                pi.cpu = line.substring(0, p).trim();

                line = line.substring(p+1, line.length).trim()
                p = line.indexOf(' '); if (p==-1) p=line.length;
                pi.memory = line.substring(0, p).trim();

                line = line.substring(p+1, line.length).trim();
                p = line.indexOf(' '); if (p==-1) p=line.length;
                pi.user = line.substring(0, p).trim();
                pi.pid = line.substring(p+1, line.length).trim();

                pidInfo.push(pi);
              })
            })
            .catch(err => {})
    })

    r = r.then(() => {
      result.forEach( res => {
        let pids = (res.pid ? [res.pid] : []).concat( res.children || []) //and all pids of childrens
        pids = [...new Set(pids)];

        let mem = 0;
        let cpu = 0;
        let user = '';
        pids.forEach( pid => {
          let pi = pidInfo.filter(p=>p.pid == pid)[0]
          if (pi) {
            mem = mem + (+pi.memory);
            cpu = cpu + (+pi.cpu);
            if (!user) user = pi.user;
          }
        })
        res.memory = mem ? formatMem(mem) : res.memory;
        res.cpu = cpu;
        res.user = user;
      })
    });

    return r.then(()=>{
      return result;
    })
}


async function ls(name, prefix, filterStr, isJson) {
  loader.on();
  try {
    let s = await getServiceList(name)
    if (filterStr) s = s.filter(i=>i.indexOf(filterStr)!==-1)
    let res = await getServiceListInfo(s, prefix)
    loader.off();
    if (isJson) {
      for (let i=0; i<res.length; i++) {delete res[i].Loaded}
      console.log(JSON.stringify(res, null, 4));
    } else {
      printLs(res)
    }
  } catch (err) {
    loader.off();

    if (err && err.lines && err.lines[0] && err.lines[0].indexOf('Failed to connect to bus: Permission denied')!==-1) {
      console.log('\n' + clc.red('Failed to connect to bus, looks like systemd user service is not running') + '\n');
    } else {
      console.log('ERROR', err)
    }
  }
}


module.exports = ls;