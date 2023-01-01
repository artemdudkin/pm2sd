const clc = require("cli-color");
const { runScript } = require('../rs');
const { loader, printLs, printWarnings, printError, formatMem, relativeTime } = require('../utils');
const { getServiceListExt } = require('./utils.os');


/**
 * Parse array of lines with comma separated string (while first line should be name of columns)
 * ['"pid","name"', '"123","xyz"', '"666","dev"'] -> [{pid:'123',name:'xyz'},{pid:'666',name:'dev'}]
 */
function parseOutputWithHeaders(lines) {
  let headers = lines[0].split(',').map(i=>i.substring(1, i.length-1));
  return lines.slice(1).map(s => {
    s = s.split(',').map(i=>i.substring(1, i.length-1));
    let o = {}
    headers.forEach( (header, index) => o[header]=s[index]);
    return o;
  });
}


/**
 * Get start type of all services - [{"ProcessId":"5392", "Name": "avp","StartMode": "Auto"}, ...]
 *
 * @returns Promise
 */
function getStartType() {
  let cmd = 'powershell -command "Get-WmiObject win32_service | Select-Object -Property ProcessId, Name, StartMode | ConvertTo-Csv -NoTypeInformation"';
  return runScript(cmd)
         .then(res => {
           return parseOutputWithHeaders( res.lines.join('').replace(/\r/g, '').split('\n').filter(l=>!l.startsWith('EXIT')) );
         })
}


function getUserName() {
//  let cmd = 'chcp 437 > nul && powershell -command "Get-Process -IncludeUsername | Select-Object -Property Id, Name, UserName | ConvertTo-Csv -NoTypeInformation"';
  let cmd = 'powershell -command "Get-Process -IncludeUsername | Select-Object -Property Id, Name, UserName | ConvertTo-Csv -NoTypeInformation"';
  return runScript(cmd)
         .then(res => {
           return parseOutputWithHeaders( res.lines.join('').replace(/\r/g, '').split('\n').filter(l=>!l.startsWith('EXIT')) );
         })
}




/**
 * Get %cpu of all processes - [{"IDProcess":"5392", "Name": "avp","PercentProcessorTime": 3.0701754385964914}, ...]
 *
 * @returns Promise
 */
function getCpuPercent() {
//  let cmd = 'powershell -command "Get-WmiObject -Query \\"Select IDProcess, Name, PercentProcessorTime from Win32_PerfRawData_PerfProc_Process where IDProcess=5124\\" | Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"';
  let cmd = 'powershell -command "Get-WmiObject Win32_PerfRawData_PerfProc_Process | Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"';
//  let p = '($_.IDProcess -eq "' + pids.join('") -or ($_.IDProcess -eq "') + '")';
//  let cmd = `powershell -command "Get-WmiObject Win32_PerfRawData_PerfProc_Process | Where-Object {${p}}| Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"`;
  let m1, m2;
  return runScript(cmd)
         .then(res => {
           m1 = parseOutputWithHeaders( res.lines.join('').replace(/\r/g, '').split('\n').slice(0, -1).filter(l=>!l.startsWith('EXIT')) );
         })
         .then(res => {
           return new Promise((resolve) => setTimeout(resolve, 100))
         })
         .then(() => {
           return runScript(cmd)
                  .then(res => {
                    m2 = parseOutputWithHeaders( res.lines.join('').replace(/\r/g, '').split('\n').slice(0, -1).filter(l=>!l.startsWith('EXIT')) );

                    total = m2[m2.length-1].PercentProcessorTime - m1[m1.length-1].PercentProcessorTime;

                    return m1.slice(0, -1).map( line => {
                      let m2line = m2.filter(m2line=>m2line.IDProcess===line.IDProcess&&m2line.Name===line.Name)[0]
                      return {IDProcess:line.IDProcess, Name:line.Name, PercentProcessorTime: (m2line?(m2line.PercentProcessorTime-line.PercentProcessorTime)*100.0/total:0)}
                    }).sort((a, b)=>a.PercentProcessorTime-b.PercentProcessorTime)
                  })
         })
}


/**
 * Get details for list of service names
 *
 * @returns {warnings:[], data:[{name, description, active, enabled, uptime, pid, memory, user, cpu}, ...]}
 */
async function getServiceListInfo(res, prefix) {
//let stime = Date.now();

      let warnings = []
      
      let userName = []
      try {
        userName = await getUserName()
      } catch (err) {
          if (err && err.lines && err.lines instanceof Array && err.lines.join('').indexOf('IncludeUserNameRequiresElevation') !== -1) {
            warnings.push('Please start script as Administrator to get user of processes');
          } else {
            return Promise.reject(err);
          }
      }

//console.log('getUserName', Date.now()-stime, 'ms'); stime=Date.now();

      let cpu = await getCpuPercent();// res.filter(i=>(+i.pid)).map(i=>(+i.pid)) )

//console.log('getCpuPercent', Date.now()-stime, 'ms'); stime=Date.now();

      let startType = await getStartType()

//console.log('getStartType', Date.now()-stime, 'ms'); stime=Date.now();

      res.forEach( service => {
        service.enabled = (startType.filter( r => r.Name===service.name)[0] || {}).StartMode || '';
        service.uptime = '';
        service.memory = '';
        service.cpu = '';
        service.user = '';
      })

      let serviceWithPIDList = res.filter( service => (+service.pid));
      if (serviceWithPIDList.length > 0) {
          let p = 'processid=' + serviceWithPIDList.map(service => (+service.pid)).join(' or processid=');
          let data = await runScript(`wmic process where (${p}) get CreationDate, ProcessId, WorkingSetSize`)

//console.log('wmic', Date.now()-stime, 'ms'); stime=Date.now();

          let dateList = data.lines.join('').replace(/\r/g, '').split('\n');
          dateList = dateList.slice(1, dateList.length);
          let d = dateList.map(line => {
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

          res.forEach( service => {
                if (+service.pid) {
                  service.uptime = (d.filter( r => +r.pid === +service.pid)[0] || {}).uptime || '';
                  service.memory = formatMem((d.filter( r => +r.pid === +service.pid)[0] || {}).mem / 1000);
                }
                service.cpu = (cpu.filter( r => r.IDProcess == service.pid)[0] || {}).PercentProcessorTime || '';
                service.user = (userName.filter( r => r.Id==service.pid)[0] || {}).UserName || '';
          })
      }

      if (prefix) {
        res.forEach( service => {
          service.name = service.name.replace(prefix + '-', '');
        })
      }

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