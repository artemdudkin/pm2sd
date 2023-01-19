const os = require('os');
const { runScript } = require('../rs');
const { getCurrentUser, splitFormated } = require('../utils');


async function prepareEnv() {
  let currentUser = await getCurrentUser();
  if (currentUser !== 'root') {
    //to avoid 'Failed to connect to bus' error
    process.env.XDG_RUNTIME_DIR = `/run/user/${os.userInfo().uid}`; // export XDG_RUNTIME_DIR=/run/user/$UID
  }
}


/**
 * Returns array of service names from 'systemctl list-unit-files'
 * (also filtered by name if any)
 */
let serviceList;
async function getServiceList(aName) {
  if (!serviceList) {
    await prepareEnv();

    let currentUser = await getCurrentUser();
    let res = await runScript(`systemctl ${currentUser==='root'?'':'--user'} list-units --type=service --all`)
    
    let r = res.lines.join('').split('\n');
    let unit_pos = res.lines[0].indexOf('UNIT'); //it can be shifted by 2 spaces or not (see tests)
    r.shift(0);

    let emptyLineFound = false;
    r = r.filter((i, index) => emptyLineFound ? false : i.length==0 ? (emptyLineFound=true)&&false : true )

    r = r.map(i=>{
              i = i.substring(unit_pos);
              let {0:unit, 1:load, 2:active, 3:sub, 4:description} = splitFormated(i);
              return {unit, load, active, sub, description}
            })
         .filter(i => i.load !=='not-found')
         .map(i => i.unit.replace(/.service$/, ''))

    serviceList = r;
  }    

  let n = (aName || '').toLowerCase();
  return serviceList
          .filter(i=>(!aName || i.toLowerCase().indexOf(n) !== -1))
          .sort((a, b) => {
            if (a.toLowerCase() < b.toLowerCase()) return -1;
            if (a.toLowerCase() > b.toLowerCase()) return 1;
            return 0;
          });
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
  getServiceList,

  getScriptFolder,
  getLogFolder,
  getServiceFolder,
  prepareEnv,
};
