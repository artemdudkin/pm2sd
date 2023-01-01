const proxyquire = require("proxyquire");
const { expect } = require("chai");

const ret_abc = `● pm2sd-a.service - PM2SD pm2sd-a
   Loaded: loaded (/etc/systemd/system/pm2sd-a.service; enabled; vendor preset: disabled)
   Active: active (exited) since Sat 2022-09-24 17:34:50 MSK; 2s ago
  Process: 1141 ExecStart=/bin/bash /usr/sbin/pm2sd-a.service.sh (code=exited, status=0/SUCCESS)
 Main PID: 25107 (code=killed, signal=TERM)
   CGroup: /system.slice/pm2sd-a.service
           ├─1142 /bin/bash /usr/sbin/pm2sd-a.sh
           ├─1143 /bin/bash /usr/sbin/pm2sd-a.service.sh
           ├─1144 tee -a /var/log/pm2sd-a/output.log
           └─1145 sleep 3

Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: pm2sd-a.service holdoff time over, scheduling restart.
Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: Stopped PM2SD pm2sd-a.
Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: Starting PM2SD pm2sd-a...
Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: Started PM2SD pm2sd-a.
EXIT 0
`;

const ret_xyz = '* xyz-vpn.service - XYZ VPN\n'+
'     Loaded: loaded (/etc/systemd/system/xyz-vpn.service; enabled; vendor preset: enabled)\n'+
'     Active: active (running) since Sat 2022-09-24 12:55:56 MSK; 4h 11min ago\n'+
'    Process: 77630 ExecStart=/bin/bash /usr/sbin/openconnect.start.sh (code=exited, status=0/SUCCESS)\n'+
'      Tasks: 1 (limit: 1102)\n'+
'     Memory: 2.7M\n'+
'     CGroup: /system.slice/xyz-vpn.service\n'+
'             `-77636 openconnect vpn.xyz.com --servercert pin-sha256:HleIYU99zl8/49HJykDwyyO3w+bLgTBC6+oX2vtlUcM=\n'+
'\n'+
'Sep 24 12:55:56 vds2318343 systemd[1]: Starting NLMK VPN...\n'+
'Sep 24 12:55:56 vds2318343 systemd[1]: Started NLMK VPN.\n'+
'EXIT 0\n';

const ret_auditd = `● auditd.service - Security Auditing Service
   Loaded: loaded (/usr/lib/systemd/system/auditd.service; enabled; vendor preset: enabled)
   Active: active (running) since Sun 2022-09-11 01:37:00 MSK; 1 weeks 6 days ago
     Docs: man:auditd(8)
           https://github.com/linux-audit/audit-documentation
 Main PID: 422 (auditd)
   Memory: 1.7M
   CGroup: /system.slice/auditd.service
           └─422 /sbin/auditd

Sep 22 18:15:36 vds2326517.my-ihor.ru auditd[422]: Audit daemon rotating log files
Warning: Journal has been rotated since unit was started. Log output is incomplete or unavailable.
EXIT 0
`;

const ret_dead = `● e2scrub_reap.service - Remove Stale Online ext4 Metadata Check Snapshots
     Loaded: loaded (/lib/systemd/system/e2scrub_reap.service; enabled; vendor preset: enabled)
     Active: inactive (dead) since Sat 2022-12-17 20:43:37 UTC; 17min ago
       Docs: man:e2scrub_all(8)
    Process: 549 ExecStart=/sbin/e2scrub_all -A -r (code=exited, status=0/SUCCESS)
   Main PID: 549 (code=exited, status=0/SUCCESS)
        CPU: 12ms

Dec 17 20:43:35 debian-s-1vcpu-1gb-ams3-01 systemd[1]: Starting Remove Stale Online ext4 Metadata Check Snapshots...
Dec 17 20:43:37 debian-s-1vcpu-1gb-ams3-01 systemd[1]: e2scrub_reap.service: Succeeded.
Dec 17 20:43:37 debian-s-1vcpu-1gb-ams3-01 systemd[1]: Finished Remove Stale Online ext4 Metadata Check Snapshots.
EXIT 0
`;

const ret_ps = `%CPU   RSS USER         PID
 0.1  1356 root      1142
 0.2   860 root      1143
 0.3   664 root      1144
 0.5  9660 root       77636
EXIT 0
`;


describe("#linux.cmd_ls", function () {

  it("ls", async function () {
    let commands = []
    let printLsResult;
    const cmd_ls = proxyquire("../src/linux/cmd_ls", {
      '../rs': {
        runScript : (cmd) => {
          commands.push(cmd);
          if (cmd.endsWith('pm2sd-a')) {
            return Promise.resolve( {lines: [ret_abc]})
          } else if (cmd.endsWith('xyz')) {
            return Promise.resolve( {lines: [ret_xyz]})
          } else if (cmd.endsWith('auditd')) {
            return Promise.resolve( {lines: [ret_auditd]})
          } else if (cmd.endsWith('e2scrub_reap')) {
            return Promise.resolve( {lines: [ret_dead]})
          } else {
            return Promise.resolve( {lines: [ret_ps]})
          }
        }
      },
      '../utils': {
         loader: {on:()=>{}, off:()=>{}},
         printLs: (res) => {printLsResult=res},
         getCurrentUser: () => 'root',
       },
      './utils.os': {
         getServiceList: () => ['pm2sd-a', 'xyz', 'auditd', 'e2scrub_reap'],
       }
    });

    let res = await cmd_ls()

    expect(commands).to.deep.equal([
        'systemctl  status pm2sd-a',
        'systemctl  status xyz', 
        'systemctl  status auditd', 
        'systemctl  status e2scrub_reap', 
        'ps -p 25107,422,549,1142,1143,1144,1145,77636 -o %cpu -o rss -o user -o pid'
    ])

    expect(printLsResult).to.deep.equal([{
          "Loaded": "loaded (/etc/systemd/system/pm2sd-a.service; enabled; vendor preset: disabled)",
          "active": "active (exited)",
          "children": ["1142","1143","1144","1145"],
          "cpu": 0.6000000000000001,
          "description": "PM2SD pm2sd-a",
          "enabled": "enabled",
          "memory": "2.9mb",
          "name": "pm2sd-a",
          "pid": "25107",
          "uptime": "2s",
          "user": "root"
        },
        {
          "Loaded": "loaded (/etc/systemd/system/xyz-vpn.service; enabled; vendor preset: enabled)",
          "active": "active",
          "children": ['77636'],
          "cpu": 0.5,
          "description": "XYZ VPN",
          "enabled": "enabled",
          "memory": "9.7mb",
          "name": "xyz-vpn",
          "pid": "",
          "uptime": "4h 11min",
          "user": "root",
        },
        {
          "Loaded": "loaded (/usr/lib/systemd/system/auditd.service; enabled; vendor preset: enabled)",
          "active": "active",
          "children": ["422"],
          "cpu": 0,
          "description": "Security Auditing Service",
          "enabled": "enabled",
          "memory": "1.7M",
          "name": "auditd",
          "pid": "422",
          "uptime": "1 weeks 6 days",
          "user": "",
        },
        {
          "Loaded": "loaded (/lib/systemd/system/e2scrub_reap.service; enabled; vendor preset: enabled)",
          "active": "inactive",
          "children": [],
          "cpu": 0,
          "description": "Remove Stale Online ext4 Metadata Check Snapshots",
          "enabled": "enabled",
          "memory": "",
          "name": "e2scrub_reap",
          "pid": "549",
          "uptime": "17min",
          "user": ""
        }
    ])
  })


  it("ls with prefix", async function () {
    let commands = []
    let printLsResult;
    const cmd_ls = proxyquire("../src/linux/cmd_ls", {
      '../rs': {
        runScript : (cmd) => {
          commands.push(cmd);
          if (cmd.endsWith('pm2sd-a')) {
            return Promise.resolve( {lines: [ret_abc]})
          } else {
            return Promise.resolve( {lines: [ret_ps]})
          }
        }
      },
      '../utils': {
         loader: {on:()=>{}, off:()=>{}},
         printLs: (res) => {printLsResult=res},
         getCurrentUser: () => 'root',
       },
      './utils.os': {
         getServiceList: () => ['pm2sd-a'],
       }
    });

    let res = await cmd_ls('pm2sd', 'pm2sd')

    expect(commands).to.deep.equal([
        'systemctl  status pm2sd-a',
        'ps -p 25107,1142,1143,1144,1145 -o %cpu -o rss -o user -o pid'
    ])

    expect(printLsResult).to.deep.equal([{
          "Loaded": "loaded (/etc/systemd/system/pm2sd-a.service; enabled; vendor preset: disabled)",
          "active": "active (exited)",
          "children": ["1142","1143","1144","1145"],
          "cpu": 0.6000000000000001,
          "description": "pm2sd-a",
          "enabled": "enabled",
          "memory": "2.9mb",
          "name": "a",
          "pid": "25107",
          "uptime": "2s",
          "user": "root"
        }
    ])
  })
});