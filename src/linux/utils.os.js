const { runScript } = require('../rs');
const { getCurrentUser } = require('../utils');

/**
 * Process string to arrya like this: '  1     2erqr 3  ' => ['1', '2erqr', '3', '']
 */
function splitFormated(str) {
  let ret = ['']
  let index=0;
  for (let i=0; i<str.length; i++) {
    if (str[i] !== ' ') {
      ret[index] = ret[index]+str[i];
    } else if (ret[index] && ret[index].length!==0){
      index++;
      ret[index] = '';
    }
  }
  return ret;
}

/**
 * Returns array of service names from 'systemctl list-unit-files'
 * (also filter by name if any)
 */
let serviceList;
async function getServiceList(aName) {
  if (!serviceList) {
    let currentUser = await getCurrentUser();
    let res = await runScript(`systemctl ${currentUser==='root'?'':'--user'} list-units --type=service --all`)
    
    let r = res.lines.join('').split('\n');
    r.shift(0);

    let emptyLineFound = false;
    r = r.filter((i, index) => emptyLineFound ? false : i.length==0 ? (emptyLineFound=true)&&false : true )

    r = r.map(i=>{
              i = i.substring(2);
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

/*
let currentUser;
async function getCurrentUser() {
  if (!currentUser) { // memoization of current user
    let whoami = await runScript('whoami');
    currentUser = whoami.lines.join('').split('\n')[0];
  } else {
  }
  return currentUser;
}
*/

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
//  getCurrentUser,
  getServiceList,

  getScriptFolder,
  getLogFolder,
  getServiceFolder,
};
