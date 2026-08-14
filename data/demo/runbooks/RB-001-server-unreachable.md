---
status: Active
relations:
  - SC-002
---
# RB-001 Server Unreachable

## When to use

Use this runbook when a server is not responding to ping, SSH, or HTTP checks.

## Prerequisites

* Access to IPMI/iDRAC console (credentials in vault)
* Network access to management VLAN

## Steps

### 1. Verify the alert

```bash
ping -c 3 <server-ip>
ssh -o ConnectTimeout=5 <server-ip> echo "ok"
curl -sS --max-time 5 http://<server-ip>:<port>/health
```

### 2. Check from different network path

Try from another server to rule out network partition:

```bash
ssh jump-host "ping -c 3 <server-ip>"
```

### 3. Check IPMI console

```bash
ipmitool -I lanplus -H <ipmi-ip> -U admin -P <pass> power status
```

If powered off:

```bash
ipmitool -I lanplus -H <ipmi-ip> -U admin -P <pass> power on
```

### 4. If server is up but unresponsive

Connect via IPMI SOL console:

```bash
ipmitool -I lanplus -H <ipmi-ip> -U admin -P <pass> sol activate
```

Check for:

* Kernel panic → hard reboot required
* OOM conditions → check `dmesg | grep -i oom`
* Disk I/O hang → check `iostat` after recovery

### 5. After recovery

1. Check all services: `systemctl list-units --failed`
2. Review logs: `journalctl --since "1 hour ago" -p err`
3. Create incident record if downtime > 5 minutes
4. Notify affected users

## Escalation

If server doesn't recover within 15 minutes, escalate to infrastructure lead.
