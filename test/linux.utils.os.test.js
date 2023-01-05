const proxyquire = require("proxyquire");
const { expect } = require("chai");

const ret_1 = `  UNIT                                   LOAD      ACTIVE     SUB          DESCRIPTION                                                       
  cpupower.service                       loaded    inactive   dead         Configure CPU power related settings                              
  crond.service                          loaded    active     running      Command Scheduler                                                 
● display-manager.service                not-found inactive   dead         display-manager.service                                           

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.

126 loaded units listed.
To show all installed unit files use 'systemctl list-unit-files'.`

const ret_2 = `UNIT                  LOAD   ACTIVE SUB     DESCRIPTION
pm2sd-xxx.service loaded active running PM2SD pm2sd-xxx

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.

1 loaded units listed. Pass --all to see loaded but inactive units, too.
To show all installed unit files use 'systemctl list-unit-files'.`



describe("#linux.utils.os", function () {

  it("getServiceList", function () {
    let commands = []
    const { getServiceList } = proxyquire("../src/linux/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          commands.push(cmd);
          return Promise.resolve( {lines: [(cmd==='whoami'?'root':ret_1)]})
        }
      },
      "../utils": {
        getCurrentUser: () => {return "root"}
      },
    });

    return getServiceList()
    .then(res => {
      expect(commands).to.deep.equal(['systemctl  list-units --type=service --all'])
      expect(res).to.deep.equal(['cpupower', 'crond'])
    })
  });


  it("getServiceList unshifted", function () {
    let commands = []
    const { getServiceList } = proxyquire("../src/linux/utils.os", {
      "../rs": {
        runScript : (cmd) => {
          commands.push(cmd);
          return Promise.resolve( {lines: [(cmd==='whoami'?'root':ret_2)]})
        }
      },
      "../utils": {
        getCurrentUser: () => {return "root"}
      },
    });

    return getServiceList()
    .then(res => {
      expect(commands).to.deep.equal(['systemctl  list-units --type=service --all'])
      expect(res).to.deep.equal(['pm2sd-xxx'])
    })
  });


  it("getServiceList with filter", function () {
    const { getServiceList } = proxyquire("../src/linux/utils.os", {
      "../rs": {runScript : (cmd) => Promise.resolve( {lines: [(cmd==='whoami'?'root':ret_1)]})},
    });

    return getServiceList('cpu')
    .then(res => {
      expect(res).to.deep.equal(['cpupower'])
    })
  });


  it("getServiceList (non-root)", function () {
    let commands = []
    const { getServiceList } = proxyquire("../src/linux/utils.os", {
      "../rs": {runScript : (cmd) => {
          commands.push(cmd);
          return Promise.resolve( {lines: [(cmd==='whoami'?'xyz':ret_1)]})
        }
      },
    });

    return getServiceList()
    .then(res => {
      expect(commands).to.deep.equal(['systemctl --user list-units --type=service --all'])
    })
  });


});