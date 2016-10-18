#!/usr/bin/python

from mininet.cli import CLI
from mininet.log import lg, info, setLogLevel
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import RemoteController

# Use the command to create tree,2 topology with dpi server and NAT
" $ sudo python t2mn.py "

# MAC of nat0 can be changed to what you want.
# This script is tested with interface wlan0 and eth0

class MyTopo(Topo):
    """
    2 layer tree topology with NAT and DPI server.
    """

    def build(self):

        # add switches
        s1 = self.addSwitch('s1', protocols=["OpenFlow13"])
        s2 = self.addSwitch('s2', protocols=["OpenFlow13"])
        s3 = self.addSwitch('s3', protocols=["OpenFlow13"])
        
        # add hosts
        h1 = self.addHost('h1')
        h2 = self.addHost('h2')
        h3 = self.addHost('h3')
        h4 = self.addHost('h4')

        # add dpi server
        dpi = self.addHost('dpi')

        # add links
        self.addLink(s1, s2)
        self.addLink(s1, s3)
        self.addLink(s2, h1)
        self.addLink(s2, h2)
        self.addLink(s3, h3)
        self.addLink(s3, h4)
        self.addLink(s1, dpi)

# topos = { 'mytopo': (lambda: MyTopo()) }
if __name__ == '__main__':
    setLogLevel('info')

    # Init Topo with no controller
    topo = MyTopo()
    net = Mininet(topo, autoSetMacs=False, controller=None)

    # Add controller with specific ip and port
    c = RemoteController('c', '0.0.0.0', 6633)
    net.addController(c)

    # nat custom settings must be set before configDefault()
    nat = net.addNAT()
    nat.setMAC('00:00:00:FF:00:00')
    nat.configDefault()

    # strat net
    net.start()
    CLI(net)
    net.stop()
