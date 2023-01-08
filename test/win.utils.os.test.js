const proxyquire = require("proxyquire");
const { expect } = require("chai");


const npmConfigOk = `diff-dst-prefix = "b/" 
diff-no-prefix = false 
diff-src-prefix = "a/" 
prefix = "C:\\\\Users\\\\X\\\\AppData\\\\Local\\\\Programs\\\\node-v16.16.0-win-x64" 
save-prefix = "^" 
tag-version-prefix = "v" 
EXIT 0
`;

const npmConfigFailed = `"npm" не является внутренней или внешней
командой, исполняемой программой или пакетным файлом.`;


const sc_ret = `
SERVICE_NAME: WpnUserService_c3150
DISPLAY_NAME: Пользовательская служба push-уведомлений Windows_c3150
        TYPE               : f0   ERROR  
        STATE              : 4  RUNNING 
                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_PRESHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
        PID                : 10476
        FLAGS              : 

SERVICE_NAME: AJRouter
DISPLAY_NAME: Служба маршрутизатора AllJoyn
        TYPE               : 20  WIN32_SHARE_PROCESS  
        STATE              : 1  STOPPED 
        WIN32_EXIT_CODE    : 1077  (0x435)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
        PID                : 0
        FLAGS              : 

SERVICE_NAME: ALG
DISPLAY_NAME: Служба шлюза уровня приложения
        TYPE               : 10  WIN32_OWN_PROCESS  
        STATE              : 1  STOPPED 
        WIN32_EXIT_CODE    : 1077  (0x435)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
        PID                : 0
        FLAGS              : 

SERVICE_NAME: ANodeLogger
DISPLAY_NAME: ANodeLogger
        TYPE               : 10  WIN32_OWN_PROCESS  
        STATE              : 4  RUNNING 
                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
        PID                : 13168
        FLAGS              : 
 
` ;


const ret_startType = `"ProcessId","Name","StartMode"
"0","ALG","Manual"
"10312","AppIDSvc","Manual"
"15324","AarSvc_40442","Manual"
"0","pm2sd-test","Auto"
EXIT 0
`

const ret_startType_sc = `[SC] QueryServiceConfig SUCCESS

SERVICE_NAME: WSearch
        TYPE               : 10  WIN32_OWN_PROCESS
        START_TYPE         : 2   AUTO_START  (DELAYED)
        ERROR_CONTROL      : 1   NORMAL
        BINARY_PATH_NAME   : C:\WINDOWS\system32\SearchIndexer.exe /Embedding
        LOAD_ORDER_GROUP   :
        TAG                : 0
        DISPLAY_NAME       : Windows Search
        DEPENDENCIES       : RPCSS
                           : BrokerInfrastructure
        SERVICE_START_NAME : LocalSystem
[SC] QueryServiceConfig SUCCESS

SERVICE_NAME: SSDPSRV
        TYPE               : 20  WIN32_SHARE_PROCESS
        START_TYPE         : 3   DEMAND_START
        ERROR_CONTROL      : 1   NORMAL
        BINARY_PATH_NAME   : C:\WINDOWS\system32\svchost.exe -k LocalServiceAndNoImpersonation -p
        LOAD_ORDER_GROUP   :
        TAG                : 0
        DISPLAY_NAME       : Обнаружение SSDP
        DEPENDENCIES       : HTTP
                           : NSI
        SERVICE_START_NAME : NT AUTHORITY\LocalService

EXIT 0
`


const ret_PerfProc = [`"IDProcess","Name","PercentProcessorTime"
"0","Idle","131831093750"
"4","System","395000000"
"15324","svchost#73","7500000"
"132","Registry","7812500"
"0","_Total","136662656250"
EXIT 0
`,
`"IDProcess","Name","PercentProcessorTime"
"0","Idle","131831093830"
"4","System","395000000"
"15324","svchost#73","7500002"
"132","Registry","7812500"
"0","_Total","136662656350"
EXIT 0
`];

const ret_PerfProc_2 = `IDProcess  Name                          PercentProcessorTime
6516       AsusNumPadService             0
15324      AsusOSD                       16
0          Idle                          773
0          _Total                        800
EXIT 0
`;








describe("#windows.utils.os", function () {

  it("getNodePath ok", async function () {
    let executed_commands = []
    const { getNodePath } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve({lines:[npmConfigOk]})
        }
      },
    });

    let path = await getNodePath();

    expect(executed_commands).to.deep.equal(['npm config ls -l | grep prefix'])
    expect(path).to.equal('C:\\Users\\X\\AppData\\Local\\Programs\\node-v16.16.0-win-x64\\node.exe')
  });


  it("getNodePath failed", async function () {
    let executed_commands = []
    const { getNodePath } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve({lines:[npmConfigFailed]})
        }
      },
    });

    let path = await getNodePath();

    expect(executed_commands).to.deep.equal(['npm config ls -l | grep prefix'])
    expect(path).to.equal(undefined);
  });


  it("getServiceListExt", async function () {
    let executed_commands = []
    const { getServiceListExt } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve({lines:[sc_ret]})
        }
      },
    });

    let res = await getServiceListExt();

    expect(executed_commands).to.deep.equal(['chcp 437 > nul && sc queryex type=service state=all'])
    expect(res).to.deep.equal([{
          "name": "ALG",
          "description": "Служба шлюза уровня приложения",
          "active": "STOPPED",
          "pid": "",
          "type": "WIN32_OWN_PROCESS"
        },{
          "name": "ANodeLogger",
          "description": "ANodeLogger",
          "active": "RUNNING",
          "pid": "13168",
          "type": "WIN32_OWN_PROCESS"
        },{
          "name": "WpnUserService_c3150",
          "description": "Пользовательская служба push-уведомлений Windows_c3150",
          "active": "RUNNING",
          "pid": "10476",
          "type": "ERROR"
        }]);
  });


  it("getServiceList", async function () {
    let executed_commands = []
    const { getServiceList } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve({lines:[sc_ret]})
        }
      },
    });

    let res = await getServiceList();

    expect(executed_commands).to.deep.equal(['chcp 437 > nul && sc queryex type=service state=all'])
    expect(res).to.deep.equal(["ALG", "ANodeLogger", "WpnUserService_c3150"]);
  });


  it("getServiceList with filter", async function () {
    let executed_commands = []
    const { getServiceList } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve({lines:[sc_ret]})
        }
      },
    });

    let res = await getServiceList("node");

    expect(executed_commands).to.deep.equal(['chcp 437 > nul && sc queryex type=service state=all'])
    expect(res).to.deep.equal(["ANodeLogger"]);
  });


  it("getStartTypeAll", async function () {
    let executed_commands = []
    const { getStartTypeAll } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve({lines:[ret_startType]})
        }
      },
    });

    let res = await getStartTypeAll();

    expect(executed_commands).to.deep.equal(['chcp 437 > nul && powershell -command "Get-WmiObject win32_service | Select-Object -Property ProcessId, Name, StartMode | ConvertTo-Csv -NoTypeInformation"'])
    expect(res).to.deep.equal([
      {Name: "ALG",          ProcessId: "0",     StartMode: "Manual"},
      {Name: "AppIDSvc",     ProcessId: "10312", StartMode: "Manual"},
      {Name: "AarSvc_40442", ProcessId: "15324", StartMode: "Manual"},
      {Name: "pm2sd-test",   ProcessId: "0",     StartMode: "Auto"},
    ]);
  });


  it("getStartType", async function () {
    let executed_commands = []
    const { getStartType } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve({lines:[ret_startType_sc]})
        }
      },
    });

    let res = await getStartType(['WSearch','SSDPSRV']);

    expect(executed_commands).to.deep.equal(['chcp 437 > nul && sc qc WSearch & sc qc SSDPSRV'])
    expect(res).to.deep.equal([
      {Name:'WSearch',StartMode: 'Auto'},
      {Name:'SSDPSRV',StartMode: 'Manual'},
    ]);
  });



  it("getCpuPercent_ps", async function () {
    let countPerfProc = 0;
    let executed_commands = []
    const { getCpuPercent_ps } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve( {lines: [ret_PerfProc[countPerfProc++]]})
        }
      },
    });

    let res = await getCpuPercent_ps();

    expect(executed_commands).to.deep.equal([
     'powershell -command "Get-WmiObject Win32_PerfRawData_PerfProc_Process | Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"',
     'powershell -command "Get-WmiObject Win32_PerfRawData_PerfProc_Process | Select-Object -Property IDProcess, Name, PercentProcessorTime | ConvertTo-Csv -NoTypeInformation"'
    ]);
    expect(res).to.deep.equal([
        {
          IDProcess: "4",
          Name: "System",
          PercentProcessorTime: 0
        },
        {
          IDProcess: "132",
          Name: "Registry",
          PercentProcessorTime: 0
        },
        {
          IDProcess: "15324",
          Name: "svchost#73",
          PercentProcessorTime: 2
        },
        {
          IDProcess: "0",
          Name: "Idle",
          PercentProcessorTime: 80
        },
    ]);
  });




  it("getCpuPercent_wmic", async function () {
    let countPerfProc = 0;
    let executed_commands = []
    const { getCpuPercent_wmic } = proxyquire("../src/windows/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          executed_commands.push(cmd);
          return Promise.resolve( {lines: [ret_PerfProc_2]})
        }
      },
    });

    let res = await getCpuPercent_wmic();

    expect(executed_commands).to.deep.equal([
     'wmic path Win32_PerfFormattedData_PerfProc_Process get Name,PercentProcessorTime,IDProcess',
    ]);
    expect(res).to.deep.equal([
        {
          IDProcess: "6516",
          Name: "AsusNumPadService",
          PercentProcessorTime: 0
        },
        {
          IDProcess: "15324",
          Name: "AsusOSD",
          PercentProcessorTime: 2
        },
        {
          IDProcess: "0",
          Name: "Idle",
          PercentProcessorTime: 96.625
        }
    ]);
  });






})
