from mininet.net import Mininet
from mininet.node import RemoteController, OVSKernelSwitch


class MNCtl(object):
    def __init__(self):
        self.mn = Mininet()
        self._links = {}

    def add_controller(self, ip, port):
        self.mn.addController(controller=RemoteController,
                              ip=ip, port=port)
        for controller in self.mn.controllers:
            controller.start()

    def add_switch(self, name):
        self.mn.addSwitch(name, cls=OVSKernelSwitch)
        s = self.mn.get(name)
        s.start(self.mn.controllers)

    def del_switch(self, name):
        s = self.mn.get(name)
        s.stop()

    def add_link(self, node1, node2):
        [n1, n2] = self.mn.get(node1, node2)
        link = self.mn.addLink(n1, n2)
        self._links[(node1, node2)] = link
        n1.attach(link.intf1)
        n2.attach(link.intf2)

    def del_link(self, node1, node2):
        [n1, n2] = self.mn.get(node1, node2)
        if self._links.get((node1, node2)):
            link = self._links.pop((node1, node2))
            n1.detach(link.intf1)
            n2.detach(link.intf2)
        else:
            link = self._links.pop((node2, node1))
            n2.detach(link.intf1)
            n1.detach(link.intf2)
        link.delete()

    def stop(self):
        self.mn.stop()
