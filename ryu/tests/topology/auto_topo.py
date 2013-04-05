from argparse import ArgumentParser
import time

from mininet.net import Mininet
from mininet.topo import Topo
from mininet.node import RemoteController, OVSKernelSwitch
from mininet.cli import CLI

def addController(mn, ip):
    mn.addController(controller=RemoteController, ip=ip)
    for controller in mn.controllers:
        controller.start()
    
def addSwitch(mn, name):
    mn.addSwitch(name, cls=OVSKernelSwitch)
    s = mn.get(name)
    s.start(mn.controllers)

_links = {}
def addLink(mn, src, dst):
    [s, d] = mn.get(src, dst)
    link = mn.addLink(s, d)
    _links[(src, dst)] = link
    s.attach(link.intf1)
    d.attach(link.intf2)

def delLink(mn, src, dst):
    [s, d] = mn.get(src, dst)
    link = _links[(src, dst)]
    s.detach(link.intf1)
    d.detach(link.intf2)
    link.delete()
    
def delSwitch(mn, name):
    s = mn.get(name)
    s.stop()

parser = ArgumentParser(
    description='Topology auto creation and modification for test.')
parser.add_argument('-c', '--controller', dest='controller', default='127.0.0.1')
args = parser.parse_args()

mn = Mininet()
ip = args.controller
addController(mn, ip)

print "Initializing..."
addSwitch(mn, 's1')
addSwitch(mn, 's2')
addSwitch(mn, 's3')
addSwitch(mn, 's4')
addLink(mn, 's1', 's2')
addLink(mn, 's1', 's3')
addLink(mn, 's1', 's4')
addLink(mn, 's2', 's3')
addLink(mn, 's2', 's4')
addLink(mn, 's3', 's4')

print "done!"
time.sleep(10)

print "Added new switch and link"
addSwitch(mn, 's5')
addLink(mn, 's5', 's3')
addLink(mn, 's5', 's4')
time.sleep(5)

print "more switch and link"
addSwitch(mn, 's6')
addLink(mn, 's6', 's3')
addLink(mn, 's6', 's4')
addLink(mn, 's6', 's5')
time.sleep(5)

print "delete some links"
delLink(mn, 's2', 's3')
delLink(mn, 's5', 's4')
time.sleep(5)

print "delete a switch"
delSwitch(mn, 's3')
time.sleep(10)

#CLI(mn)

mn.stop()
print "delete all"
