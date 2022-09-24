const { runScript } = require('./rs');


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


let currentUser;
async function getCurrentUser() {
  if (!currentUser) { // memoization of current user
    let whoami = await runScript('whoami');
    currentUser = whoami.lines.join('').split('\n')[0];
  } else {
  }
  return currentUser;
}



module.exports = { 
  getCurrentUser,
  getServiceList 
};
