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

    expect(executed_commands).to.deep.equal(['sc queryex type=service state=all'])
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

    expect(executed_commands).to.deep.equal(['sc queryex type=service state=all'])
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

    expect(executed_commands).to.deep.equal(['sc queryex type=service state=all'])
    expect(res).to.deep.equal(["ANodeLogger"]);
  });



})
