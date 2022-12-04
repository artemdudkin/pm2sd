const { runScript } = require('./rs');

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
async function getServiceList(name) {
  let currentUser = await getCurrentUser();
/*
  return runScript(`systemctl ${currentUser==='root'?'':'--user'} list-unit-files --type=service`)
    .then(res => {
//console.log('res', res);
      let r = res.lines.join('')
                       .split('\n')
                       .filter(i=>i.indexOf('EXIT')!==0 && i.indexOf('UNIT')!==0 && i.indexOf('files listed.')===-1 )
                       .filter(i=>{
                         let type = i.substring(i.indexOf(' '), i.length).trim().split(' ')[0];
                         return type !=='static' && type !== ''
                       })
                       .map(i=>i.split(' ')[0].trim())

      return r.filter(i=>i.indexOf('.service')!==-1)
              .filter(i=>(name ? i.indexOf(name)!==-1 : true))
              .sort();
    })
*/

  return runScript(`systemctl ${currentUser==='root'?'':'--user'} list-units --type=service --all`)
    .then(res => {
//console.log('res', res);
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
          .map(i=>i.unit)

      return r.filter(i=>i.indexOf('.service')!==-1)
              .filter(i=>(name ? i.indexOf(name)!==-1 : true))
              .sort((a, b) => {
                if (a.toLowerCase() < b.toLowerCase()) return -1;
                if (a.toLowerCase() > b.toLowerCase()) return 1;
                return 0;
              });
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
