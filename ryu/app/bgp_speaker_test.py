import eventlet
import time

eventlet.monkey_patch()

import logging
import sys
logging.basicConfig(level=logging.INFO)

from ryu.services.protocols.bgp.bgpspeaker import BGPSpeaker
from ryu.services.protocols.bgp.info_base.base import AttributeMap
from ryu.services.protocols.bgp.info_base.base import PrefixFilter

def dump_remote_best_path_change(event):
    print 'the best path changed:', event.remote_as, event.prefix,\
        event.nexthop, event.is_withdraw

if __name__ == "__main__":
    speaker = BGPSpeaker(as_number=65000, router_id='10.0.0.7',
                         best_path_change_handler=dump_remote_best_path_change, ssh_console=True,
                         label_range=(1000,1999))

    speaker.neighbor_add('172.16.6.101', 9598, enable_ipv4=True, enable_vpnv4=True)
    speaker.neighbor_add('192.168.50.102', 65000, enable_ipv4=True, enable_vpnv4=True)
    #speaker.vrf_add('65010:101', ['65010:101'], ['65010:101'])
    eventlet.sleep(5)
    #speaker.prefix_add('192.168.103.0/30', next_hop='0.0.0.0', route_dist='65010:101')
    speaker.prefix_add('192.168.103.0/30', next_hop='0.0.0.0')

    pref_filter = PrefixFilter('192.168.103.0/30', PrefixFilter.POLICY_PERMIT)
    attr_map = AttributeMap([pref_filter], AttributeMap.ATTR_TYPE_LOCAL_PREFERENCE, 250)
    speaker.attribute_map_set('192.168.50.102', [attr_map])
    
    while True:
        eventlet.sleep(5)
