#!/usr/bin/python

from mininet.cli import CLI
from mininet.log import lg, info
from mininet.topo import Topo

# Use the command to create tree,2 topology with dpi server and NAT
" sudo mn --custom t2_nat_dpi.py --topo mytopo --nat --mac --switch ovsk,protocols=OpenFlow13 --controller remote "


class MyTopo(Topo):
    """
    2 layer tree topology with NAT and DPI server.
    """

    def __init__(self):
        Topo.__init__(self)
            
        # add switches
        s1 = self.addSwitch('s1')
        s2 = self.addSwitch('s2')
        s3 = self.addSwitch('s3')
        
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

topos = { 'mytopo': (lambda: MyTopo()) }
