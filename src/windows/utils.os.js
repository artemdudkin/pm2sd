const { runScript } = require('../rs');


/**
 * Returns service list [{name, description, type, active, pid}, ... ]
 */
let serviceListExt;
async function getServiceListExt(aName) {
  if (!serviceListExt) {
//    let res = await runScript(`cmd /c chcp 65001>nul && sc queryex type=service state=all`)
    let res = await runScript(`sc queryex type=service state=all`)

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
      r.active = (lineSTATE.split(':')[1] || '').trim()
      r.active = r.active.substring( r.active.indexOf(' ')+1, r.active.length).trim()

      while (++i < lines.length && lines[i].replace(/\r/g, '').length !== 0) {
        let line = lines[i].replace(/\r/g, '');
        let {0:name, 1:value} = line.split(':');
        name = name.trim();
        value = (value || '').trim();
        if (name === 'PID' || name.startsWith('ID_')) r.pid=value
        if (r.pid === '0') r.pid = '';
      }

      if (!r.type.startsWith('WIN32_SHARE_PROCESS') && !r.type.startsWith('USER_SHARE_PROCESS')) ret.push(r);
    }
    serviceListExt = ret;
  }

  let n = (aName || '').toLowerCase();
  return serviceListExt
    .filter( r => (!aName || r.name.toLowerCase().indexOf(n) !== -1))
    .sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
}


/**
 * Returns array of service names 
 * (also filter by name if any)
 */
async function getServiceList(aName) {
  let ret = await getServiceListExt(aName);
  return ret.map(i=>i.name)
}


function getScriptFolder(user) {
 return '';
}


function getLogFolder(user) {
  return '';
}


function getServiceFolder(user) {
  return '';
}


module.exports = { 
  getServiceList,
  getServiceListExt,

  getScriptFolder,
  getLogFolder,
  getServiceFolder,
};
