const os = require('os');
const { runScript } = require('./rs');

async function getCurrentUser() {
  let whoami = await runScript('whoami');
  let currentUser = whoami.lines.join('').split('\n')[0];
  return currentUser;
}


/**
 * Returns array of service names from /etc/systemd/system
 * (also filter by name if any)
 */
function getSystemServiceList(name) {
  return runScript('ls /etc/systemd/system')
    .then(res => {
      let r = res.lines.join('').split('\n').filter(i=>i.indexOf('EXIT')!==0)

      return r.filter(i=>i.indexOf('.service')!==-1)
              .filter(i=>(name ? i.indexOf(name)!==-1 : true))
              .sort();
    })
}


/**
 * Returns array of service names from 'systemctl list-unit-files'
 * (also filter by name if any)
 */
function getServiceList(name) {
  return runScript('systemctl list-unit-files')
    .then(res => {
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
  getCurrentUser,
  getServiceList,
  getSystemServiceList,

  getScriptFolder,
  getLogFolder,
  getServiceFolder
};