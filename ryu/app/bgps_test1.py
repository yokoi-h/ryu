import eventlet

eventlet.monkey_patch()

import logging
logging.basicConfig(level=logging.DEBUG)

from ryu.services.protocols.bgp.bgpspeaker import BGPSpeaker


def dump_remote_best_path_change(event):
    print 'the best path changed:', event.remote_as, event.prefix,\
        event.nexthop, event.is_withdraw

if __name__ == "__main__":
    speaker = BGPSpeaker(as_number=65011, router_id='10.0.1.1',
                         best_path_change_handler=dump_remote_best_path_change, ssh_console=True,
                         label_range=(1000, 1999))

    speaker.neighbor_add('192.168.101.101', 65010, enable_ipv4=True, enable_vpnv4=True, multi_exit_disc=100)
    speaker.neighbor_add('192.168.104.102', 65011, enable_ipv4=True, enable_vpnv4=True, next_hop='10.0.1.1')
    speaker.neighbor_add('10.0.1.3', 65011, enable_ipv4=True, enable_vpnv4=True, next_hop='10.0.1.1')
    rd1 = '65010:101'
    speaker.vrf_add(rd1, [rd1], [rd1])
    eventlet.sleep(5)
    speaker.prefix_add('192.168.4.0/30', next_hop='0.0.0.0', route_dist=rd1)
    speaker.prefix_add('10.10.10.4/32', next_hop='192.168.4.2', route_dist=rd1)
    speaker.prefix_add('192.168.204.0/30', next_hop='192.168.4.2', route_dist=rd1)

    eventlet.sleep(5)

    while True:
        eventlet.sleep(5)
