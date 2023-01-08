const clc = require("cli-color");
const { runScript } = require('../rs');
const { loader, printLs, printWarnings, printError, formatMem, relativeTime, splitFormated, parseOutputWithHeaders, getRunScriptLines } = require('../utils');
const { getServiceListExt, getStartTypeAll, getStartType, getCpuPercent_wmic } = require('./utils.os');


function getUserNameAll() {
//  let cmd = 'chcp 65001 > nul && powershell -command "Get-Process -IncludeUsername | Select-Object -Property Id, Name, UserName | ConvertTo-Csv -NoTypeInformation"';
  let cmd = 'powershell -command "Get-Process -IncludeUsername | Select-Object -Property Id, Name, UserName | ConvertTo-Csv -NoTypeInformation"';
  return runScript(cmd)
         .then(res => {
           let ret = parseOutputWithHeaders( getRunScriptLines(res) );
           return ret;
         })
}


/**
 * Get memory and uptime of selected processes - [{ pid, mem, uptime }, ...]
 *
 * @returns Promise
 */
async function getMU(res) {
      let serviceWithPIDList = res.filter( service => (+service.pid));
      if (serviceWithPIDList.length > 0) {
          let p = 'processid=' + serviceWithPIDList.map(service => (+service.pid)).join(' or processid=');
          let data = await runScript(`wmic process where (${p}) get CreationDate, ProcessId, WorkingSetSize`)

          let dateList = getRunScriptLines(data);
          dateList = dateList.slice(1, dateList.length);
          return dateList.map(line => {
            let pos = line.indexOf(' ');
            let date = line.substring(0, pos).trim();

            line = line.substring(pos+1, line.length).trim();
            pos = line.indexOf(' ');
            let pid = line.substring(0, pos).trim();
            let mem = line.substring(pos+1, line.length).trim();

            let year = date.substring(0, 4);
            let mon = date.substring(4, 6);
            let day = date.substring(6, 8);
            let hour = date.substring(8, 10);
            let minute = date.substring(10, 12);
            let second = date.substring(12, 14);
            let uptime = relativeTime((new Date(year, mon-1, day, hour, minute, second)).getTime());

            return { pid, mem, uptime }
          })
      }
      return [];
}


/**
 * Get details for list of service names
 *
 * @returns {warnings:[], data:[{name, description, active, enabled, uptime, pid, memory, user, cpu}, ...]}
 */
async function getServiceListInfo(res, prefix) {
//let stime = Date.now();

      let warnings = []

      let p1 = getUserNameAll().catch(err => {
          if (err && err.lines && err.lines instanceof Array && err.lines.join('').indexOf('IncludeUserNameRequiresElevation') !== -1) {
            warnings.push('Please start script as Administrator to get user of processes');
            return [];
          } else {
            return Promise.reject(err);
          }
      })
//      .then(res=>{console.log('getUserNameAll', Date.now()-stime, 'ms');return res;})

      let p2 = getCpuPercent_wmic()
//               .then(res=>{console.log('getCpuPercent', Date.now()-stime, 'ms');return res;})

      let p3 = res.length > 20
               ? getStartTypeAll()//.then(res=>{console.log('getStartTypeAll', Date.now()-stime, 'ms');return res;})
               : getStartType(res.map(i=>i.name))//.then(res=>{console.log('getStartType', Date.now()-stime, 'ms');return res;})

      let p4 = getMU(res)
//               .then(res=>{console.log('getMU', Date.now()-stime, 'ms');return res;})

      let [userName, cpu, startType, d] = await Promise.all([p1, p2, p3, p4])

//console.log('all', Date.now()-stime, 'ms'); stime=Date.now();

      res.forEach( service => {
        service.enabled = '';
        service.uptime = '';
        service.memory = '';
        service.cpu = '';
        service.user = '';

        service.enabled = (startType.filter( r => r.Name===service.name)[0] || {}).StartMode || '';
        if (+service.pid) {
          service.uptime = (d.filter( r => +r.pid === +service.pid)[0] || {}).uptime || '';
          service.memory = formatMem((d.filter( r => +r.pid === +service.pid)[0] || {}).mem / 1000);
        }
        service.cpu = (cpu.filter( r => r.IDProcess == service.pid)[0] || {}).PercentProcessorTime || '';
        service.user = (userName.filter( r => r.Id==service.pid)[0] || {}).UserName || '';

        if (prefix) service.name = service.name.replace(prefix + '-', '');
      })

      return {warnings, data:res};
}


async function ls(name, prefix, filterStr, isJson) {
  loader.on();
  try {
    let s = await getServiceListExt(name)
    if (filterStr) s = s.filter(i=>i.name.indexOf(filterStr)!==-1)
    let res = await getServiceListInfo(s, prefix)
    loader.off();
    printWarnings(res.warnings)
    if (isJson) {
      console.log(JSON.stringify(res.data, null, 4));
    } else {
      printLs(res.data)
    }
  } catch (err) {
    loader.off();
    printError(err);
  }
}



module.exports = ls;