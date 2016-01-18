# New server setup
This details the steps taken to set up a new server on Ubuntu 14.04:

XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# TODO:
-Remove pem of private key from system before setting up AMI
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX





# Setup


## Update packages
sudo apt-get update
sudo apt-get upgrade

## Setup Libraries
sudo apt-get install -y build-essential pkg-config autoconf automake libtool uuid-dev libpgm-dev python-dev python-pip ntp libicu-dev htop

### setup libsodium
git clone git://github.com/jedisct1/libsodium.git
cd libsodium
./autogen.sh
./configure && make check
sudo make install
sudo ldconfig

### setup zmq
cd ..
wget http://download.zeromq.org/zeromq-4.1.4.tar.gz
tar -xvzf zeromq-4.1.4.tar.gz
cd zeromq-4.1.4
./autogen.sh
./configure --with-pgm && make check
sudo make install
sudo ldconfig


### setup node
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs

### setup redis
sudo add-apt-repository ppa:chris-lea/redis-server
sudo apt-get update
sudo apt-get install redis-server

# System Config
### Configure system settings
## In /etc/sysctl.conf add:
```
kern.maxfiles=1000000
kern.maxfilesperproc=1000000
net.ipv4.tcp_wmem = 4096 65536 16777216
kernel.sem = 250 32000 100 128
net.core.rmem_default = 262144
net.core.wmem_default = 262144
net.core.netdev_max_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65000
net.ipv4.tcp_tw_reuse = 1
net.inet.ip.portrange.first=32768

vm.overcommit_memory = 1

net.core.somaxconn = 16384
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_mem = 50576   64768   98152

net.ipv4.tcp_keepalive_time = 40
net.ipv4.tcp_keepalive_intvl = 20
net.ipv4.tcp_keepalive_probes = 4
```
Keepalive is for determining how long to wait before marking a connection as closed / broken (time = length before first check; intvl = interval after check, resends probe every N seconds; probes = if no ACK response is received after N probes, connection is marked as closed)


## in /etc/security/limits.conf add:
```
* soft nofile 65536 
* hard nofile 65536
```

## in /etc/rc.local contents should be:
```
#!/bin/sh -e
#
# rc.local
#
# This script is executed at the end of each multiuser runlevel.
# Make sure that the script will "exit 0" on success or any other
# value on error.
#
# In order to enable or disable this script just change the execution
# bits.
#
# By default this script does nothing.
( /etc/init.d/ntp stop
until ping -nq -c3 8.8.8.8; do
    echo "Waiting for network..."
done
ntpdate -s time.nist.gov
/etc/init.d/ntp start )&

# For redis
echo never > /sys/kernel/mm/transparent_hugepage/enabled

exit 0
```

# Software

## RethinkDB
https://www.rethinkdb.com/docs/install/ubuntu/
and
https://www.rethinkdb.com/docs/start-on-startup/#startup-with-initd

Note: Each client server should run a proxy, e.g., `/usr/bin/rethinkdb proxy --join HOST --bind all`

## RabbitMQ
Add management plugin:
`rabbitmq-plugins enable rabbitmq_management`

## NOTES
After setting these values, reboot the system
