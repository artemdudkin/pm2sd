var clc = require("cli-color");
const { runScript } = require('./rs');
const { loader, printLs, formatMem } = require('./utils');


async function getServiceList(name) {
  return runScript(`sc queryex type=service state=all`)
    .then(res => {
      let lines = res.lines.join('').split('\n').filter(i=>i.indexOf('EXIT')===-1);
      let ret = [];

      let i=0;
      while (++i < lines.length) {
        let line = lines[i].replace(/\r/g, '');

        let sname = (line.split(':')[1] || '').trim();
        let r = {name : sname}

        let lineDISPLAY_NAME = lines[++i].replace(/\r/g, '').trim();
        let lineTYPE = lines[++i].replace(/\r/g, '').trim();
        let lineSTATE = lines[++i].replace(/\r/g, '').trim();

        r.description = (lineDISPLAY_NAME.split(':')[1] || '').trim()
        r.type = (lineTYPE.split(':')[1] || '').trim()
        r.type = r.type.substring( r.type.indexOf(' ')+1, r.type.length).trim()
        r.state = (lineSTATE.split(':')[1] || '').trim()
        r.state = r.state.substring( r.state.indexOf(' ')+1, r.state.length).trim()

        while (++i < lines.length && lines[i].replace(/\r/g, '').length !== 0) {
          let line = lines[i].replace(/\r/g, '');
          let {0:name, 1:value} = line.split(':');
          name = name.trim();
          value = (value || '').trim();
          if (name === 'PID' || name.startsWith('ID_')) r.pid=value
        }
        if (!r.type.startsWith('WIN32_SHARE_PROCESS')) ret.push(r);//console.log( JSON.stringify(r));
      }
      return ret.sort((a, b) => {
       const nameA = a.name.toUpperCase();
       const nameB = b.name.toUpperCase();
       if (nameA < nameB) return -1;
       if (nameA > nameB) return 1;
       return 0;
      });
    })
}



/**
 * Get details for list of service names
 *
 * @returns [{name, description, active, enabled, uptime, pid, memory, user, cpu, Loaded}, ...]
 */
async function getServiceListInfo(res, prefix) {
    let r = Promise.resolve();

    return runScript(`tasklist`)
    .then(tl => {
      let ret = tl.lines.join('').replace(/\r/g, '').split('\n').slice(4).map(line => {
        let pos = line.indexOf(' ');
        let r = {name : line.substring(0, pos)}
        line = line.substring(pos+1, line.length).trim();

        pos = line.indexOf(' ');
        r.pid = line.substring(0, pos)
        line = line.substring(pos+1, line.length).trim();

        pos = line.indexOf(' ');
        r.session_name = line.substring(0, pos)
        line = line.substring(pos+1, line.length).trim();

        pos = line.indexOf(' ');
        r.session_number = line.substring(0, pos)
        r.memory = formatMem(line.substring(pos+1, line.length).trim().replace(/ /g, '').replace(/[^0-9.]/g, ''));

        return r;
      })

      res.forEach( service => {
        if (+service.pid) {
          service.memory = (ret.filter( r => +r.pid === +service.pid)[0] || {}).memory || '';
        }
      })

/*
      res.forEach( service => {
        r = r.then(() => {
          if (+service.pid) {
            return runScript(`wmic process where processid=${service.pid} get WorkingSetSize`)
            .then(res => {
              let wss = res.lines.join('').replace(/\r/g, '').split('\n')[1];
              service.cpu = formatMem(Math.round(wss / 100) / 10);
console.log(service.name, service.pid, 'res', wss, formatMem(Math.round(wss / 100) / 10))
            })
            .catch(res => {
            });
          }
        })
      })
*/
      return r.then(()=>{
        return res;
      })
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