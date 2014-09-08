import eventlet

eventlet.monkey_patch()

import logging
logging.basicConfig(level=logging.DEBUG)

from ryu.services.protocols.bgp.bgpspeaker import BGPSpeaker
from ryu.services.protocols.bgp.info_base.base import AttributeMap
from ryu.services.protocols.bgp.info_base.base import PrefixFilter
from ryu.services.protocols.bgp.info_base.base import ASPathFilter

def dump_remote_best_path_change(event):
    print 'the best path changed:', event.remote_as, event.prefix,\
        event.nexthop, event.is_withdraw

if __name__ == "__main__":
    speaker = BGPSpeaker(as_number=65000, router_id='10.0.0.7',
                         best_path_change_handler=dump_remote_best_path_change, ssh_console=True,
                         label_range=(1000,1999))

    speaker.neighbor_add('172.16.6.101', 9598, enable_ipv4=True, enable_vpnv4=True)
    speaker.neighbor_add('192.168.50.102', 65000, enable_ipv4=True, enable_vpnv4=True)
    eventlet.sleep(5)
    speaker.prefix_add('192.168.103.0/30', next_hop='0.0.0.0')

    eventlet.sleep(10)
    # set LocalPreference 250 to Path(192.168.103.0)
    pref_filter = PrefixFilter('192.168.103.0/30', PrefixFilter.POLICY_PERMIT)
    attr_map_prefix = AttributeMap([pref_filter], AttributeMap.ATTR_TYPE_LOCAL_PREFERENCE, 250)

    # set LocalPreference 200 to Path containing AS 9598
    #aspath_filter = ASPathFilter(9598, ASPathFilter.POLICY_END)
    #attr_map_aspath1 = AttributeMap([aspath_filter], AttributeMap.ATTR_TYPE_LOCAL_PREFERENCE, 200)

    # set LocalPreference 200 to Path containing AS 9599
    aspath_filter = ASPathFilter(9599, ASPathFilter.POLICY_INCLUDE)
    attr_map_aspath2 = AttributeMap([aspath_filter], AttributeMap.ATTR_TYPE_LOCAL_PREFERENCE, 230)

    # set LocalPreference 200 to Path containing AS 9599
    aspath_filter = ASPathFilter(9600, ASPathFilter.POLICY_END)
    attr_map_aspath3 = AttributeMap([aspath_filter], AttributeMap.ATTR_TYPE_LOCAL_PREFERENCE, 240)

    # set attribute map to neighbor
    speaker.attribute_map_set('192.168.50.102', [attr_map_prefix, attr_map_aspath2, attr_map_aspath3])
    
    while True:
        eventlet.sleep(5)
