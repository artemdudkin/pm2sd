const path = require('path');
const { runScript } = require('../rs');
const { parseOutputWithHeaders, getRunScriptLines, splitFormated } = require('../utils');


/**
 * Returns service list [{name, description, type, active, pid}, ... ]
 * (also filtered by name if any)
 */
let serviceListExt;
async function getServiceListExt(aName) {
  if (!serviceListExt) {
//    let res = await runScript(`cmd /c chcp 65001>nul && sc queryex type=service state=all`)
    let res = await runScript(`chcp 437 > nul && sc queryex type=service state=all`)

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
    serviceListExt = ret.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }
//console.log('serviceListExt', serviceListExt);

  let n = (aName || '').toLowerCase();
  return serviceListExt
    .filter( r => (!aName || r.name.toLowerCase().indexOf(n) !== -1))
}


/**
 * Returns array of service names 
 * (also filtered by name if any)
 */
async function getServiceList(aName) {
  let ret = await getServiceListExt(aName);
  return ret.map(i=>i.name)
}


function getLogFolder() {
  return "C:\\logs";
}


/**
 * Get location of installed node.js
 */
async function getNodePath() {
  let nodePath;
  let res = await runScript('npm config ls -l | grep prefix');
  getRunScriptLines(res).forEach(line => {
    let l = line.replace(/\r/g, '').split(' = ');
    if (l[0] === 'prefix') nodePath = l[1].trim().replace(/"$/, '').replace(/^"/, '').replace(/\\\\/g, '\\')
  })
  if (nodePath) nodePath = path.join(nodePath, 'node.exe');
  return nodePath;
}



/**
 * Get start type of all services - [{"ProcessId":"5392", "Name": "avp","StartMode": "Auto"}, ...]
 *
 * @returns Promise
 */
function getStartTypeAll() {
  let cmd = 'chcp 437 > nul && powershell -command "Get-WmiObject win32_service | Select-Object -Property ProcessId, Name, StartMode | ConvertTo-Csv -NoTypeInformation"';
  return runScript(cmd)
         .then(res => {
           let ret = parseOutputWithHeaders( getRunScriptLines(res) );
           return ret;
         })
}


/**
 * Get start type of selected services - [{"Name": "avp","StartMode": "Auto"}, ...]
 *
 * @returns Promise
 */
function getStartType(serviceList) {
  let cmd = serviceList.map(i=>`sc qc ${i}`).join(' & ');
  return runScript(`chcp 437 > nul && ${cmd}`)
         .then(res => {
           let ret = [];
           getRunScriptLines(res).forEach( line => {
             let l = line.split(':');
             if (l[0].trim() === 'SERVICE_NAME') {
               ret.push({"Name": l[1].trim(),"StartMode": ""})
             } else if (ret.length > 0){
               if (l[0].trim() === 'START_TYPE') ret[ret.length-1].StartMode = (l[1].indexOf('AUTO_START')!==-1?'Auto':'Manual')
             }
           })
           return ret;
         })
}


/**
 * Get %cpu of all processes - [{"IDProcess":"5392", "Name": "avp","PercentProcessorTime": 3.0701754385964914}, ...]
 *
 * @returns Promise
 */
function getCpuPercent_ps() {
//  let cmd = 'powershell -command "Get-WmiObject -Query \\"Select IDProcess, Name, PercentProcessorTime from Win32_PerfRawData_PerfProc_Process where IDProcess=5124\\" | Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"';
  let cmd = 'powershell -command "Get-WmiObject Win32_PerfRawData_PerfProc_Process | Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"';
//  let p = '($_.IDProcess -eq "' + pids.join('") -or ($_.IDProcess -eq "') + '")';
//  let cmd = `powershell -command "Get-WmiObject Win32_PerfRawData_PerfProc_Process | Where-Object {${p}}| Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"`;
  let m1, m2;
  return runScript(cmd)
         .then(res => {
           m1 = parseOutputWithHeaders( getRunScriptLines(res) );
         })
         .then(res => {
           return new Promise((resolve) => setTimeout(resolve, 100))
         })
         .then(() => {
           return runScript(cmd)
                  .then(res => {
                    m2 = parseOutputWithHeaders( getRunScriptLines(res) );

                    total = m2[m2.length-1].PercentProcessorTime - m1[m1.length-1].PercentProcessorTime;

                    return m1.slice(0, -1).map( line => {
                      let m2line = m2.filter(m2line=>m2line.IDProcess===line.IDProcess&&m2line.Name===line.Name)[0]
                      return {IDProcess:line.IDProcess, Name:line.Name, PercentProcessorTime: (m2line?(m2line.PercentProcessorTime-line.PercentProcessorTime)*100.0/total:0)}
                    }).sort((a, b)=>a.PercentProcessorTime-b.PercentProcessorTime)
                  })
         })
}


/**
 * Get %cpu of all processes - [{"IDProcess":"5392", "Name": "avp","PercentProcessorTime": 3.0701754385964914}, ...]
 * (LOOKS FASTER THEN getCpuPercent_ps)
 *
 * @returns Promise
 */
function getCpuPercent_wmic() {
  let cmd = 'wmic path Win32_PerfFormattedData_PerfProc_Process get Name,PercentProcessorTime,IDProcess';
  return runScript(cmd)
         .then(res => {
           let m1 = parseOutputWithHeaders(getRunScriptLines(res), splitFormated);
           let total = +m1.filter(i=>i.Name === '_Total')[0].PercentProcessorTime;
           return m1.slice(0, -1).map( line => {
             return {IDProcess:line.IDProcess, Name:line.Name, PercentProcessorTime: line.PercentProcessorTime*100.0/total}
           }).sort((a, b)=>a.PercentProcessorTime-b.PercentProcessorTime)
         })
}


module.exports = { 
  getServiceList,
  getServiceListExt,

  getLogFolder,

  getNodePath,

  getStartTypeAll,
  getStartType,

  getCpuPercent_ps,
  getCpuPercent_wmic,
};
