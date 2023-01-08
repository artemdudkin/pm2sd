const proxyquire = require("proxyquire");
const { expect } = require("chai");

const ret_getProcess = `"Id","Name","UserName"
"5692","ctfmon","USER\\X"
"4192","dasHost","NT AUTHORITY\\LOCAL SERVICE"
"12340","dllhost","USER\\X"
"15324","svchost","USER\\X"
EXIT 0
`;


const f2 = (n) => (n < 10 ? '0'+n : ''+n)
const d = new Date( Date.now() - 4020000);
//20230101193920.182706+180
const dateMark = '' + d.getFullYear() + f2(d.getMonth()+1) + f2(d.getDate()) + f2(d.getHours()) + f2(d.getMinutes()) + f2(d.getSeconds()) + '.182706+000';
const ret_wmic = `CreationDate               ProcessId  WorkingSetSize  
${dateMark}  15324      24104960        
EXIT 0
`


describe("#windows.cmd_ls", function () {

  it("ls", async function () {
    let commands = []
    let printLsResult;
    let countPerfProc = 0;
    const cmd_ls = proxyquire("../src/windows/cmd_ls", {
      '../rs': {
        runScript : (cmd) => {
          commands.push(cmd);
          if (cmd.indexOf('Get-Process') !== -1) {
            return Promise.resolve( {lines: [ret_getProcess]})
          } else {
            return Promise.resolve( {lines: [ret_wmic]})
          }
        }
      },
      '../utils': {
         loader: {on:()=>{}, off:()=>{}},
         printLs: (res) => {printLsResult=res},
       },
      './utils.os': {
         getServiceListExt: () => [{
           name: 'AarSvc_40442',
           description: 'AarSvc_40442',
           type: 'ERROR',
           active: 'RUNNING',
           pid: '15324'
         },{
           name: 'pm2sd-test',
           description: 'pm2sd-test',
           type: 'WIN32_OWN_PROCESS',
           active: 'STOPPED',
           pid: ''
         }],
/*         getStartTypeAll : () => Promise.resolve([
           {"Name": "ALG", "ProcessId": "0", "StartMode": "Manual"},
           {"Name": "AppIDSvc", "ProcessId": "10312", "StartMode": "Manual"},
           {"Name": "AarSvc_40442", "ProcessId": "15324", "StartMode": "Manual"},
           {"Name": "pm2sd-test", "ProcessId": "0", "StartMode": "Auto"}
         ]),*/
         getStartType : () => Promise.resolve([
           {"Name": "AarSvc_40442", "ProcessId": "15324", "StartMode": "Manual"},
           {"Name": "pm2sd-test", "ProcessId": "1234", "StartMode": "Auto"}
         ]),
         getCpuPercent_wmic: () => Promise.resolve([
           {IDProcess: "15324", Name: "AarSvc_40442", PercentProcessorTime: 2}
         ])
       }
    });

    let res = await cmd_ls()

    expect(commands).to.deep.equal([
      'powershell -command "Get-Process -IncludeUsername | Select-Object -Property Id, Name, UserName | ConvertTo-Csv -NoTypeInformation"',
      'wmic process where (processid=15324) get CreationDate, ProcessId, WorkingSetSize',
    ])

    expect(printLsResult).to.deep.equal([{
          "name": "AarSvc_40442",
          "description": "AarSvc_40442",
          "active": "RUNNING",
          "enabled": "Manual",
          "type": "ERROR",
          "pid": "15324",
          "cpu": 2,
          "memory": "24.1mb",
          "uptime": "1h 7min",
          "user": "USER\\X"
        },{
          "name": "pm2sd-test",
          "description": "pm2sd-test",
          "active": "STOPPED",
          "enabled": "Auto",
          "type": "WIN32_OWN_PROCESS",
          "pid": "",
          "cpu": "",
          "memory": "",
          "uptime": "",
          "user": ""
        }
      ])
  })




  it("ls with prefix", async function () {
    let commands = []
    let printLsResult;
    let countPerfProc = 0;
    const cmd_ls = proxyquire("../src/windows/cmd_ls", {
      '../rs': {
        runScript : (cmd) => {
          commands.push(cmd);
          if (cmd.indexOf('Get-Process') !== -1) {
            return Promise.resolve( {lines: [ret_getProcess]})
          } else {
            return Promise.resolve( {lines: [ret_wmic]})
          }
        }
      },
      '../utils': {
         loader: {on:()=>{}, off:()=>{}},
         printLs: (res) => {printLsResult=res},
       },
      './utils.os': {
         getServiceListExt: () => [{
           name: 'pm2sd-test',
           description: 'pm2sd-test',
           type: 'WIN32_OWN_PROCESS',
           active: 'STOPPED',
           pid: ''
         }],
         getStartType : () => Promise.resolve([
           {"Name": "pm2sd-test", "ProcessId": "1234", "StartMode": "Auto"}
         ]),
         getCpuPercent_wmic: () => Promise.resolve([])
       }
    });

    let res = await cmd_ls('pm2sd', 'pm2sd')

    expect(commands).to.deep.equal([
      'powershell -command "Get-Process -IncludeUsername | Select-Object -Property Id, Name, UserName | ConvertTo-Csv -NoTypeInformation"',
    ])

    expect(printLsResult).to.deep.equal([{
          "name": "test",
          "description": "pm2sd-test",
          "active": "STOPPED",
          "enabled": "Auto",
          "pid": "",
          "type": "WIN32_OWN_PROCESS",
          "user": "",
          "cpu": "",
          "memory": "",
          "uptime": ""
        }
      ])
  });
});