# Copyright (C) 2014 Nippon Telegraph and Telephone Corporation.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
# implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from ryu.lib import hub
from ryu.base.app_manager import RyuApp
from ryu.services.protocols.bgp.bgpspeaker import BGPSpeaker
from ryu.controller import ofp_event
from ryu.ofproto import ofproto_v1_3
from ryu.base import app_manager
from ryu.app.rest_router import RouterController
from ryu.app.wsgi import WSGIApplication
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.lib.packet import packet
from ryu.lib.packet import ethernet
from ryu.lib.packet import ipv4
from ryu.lib.packet import tcp
from ryu.lib.packet import arp
from ryu.ofproto import ether
from ryu.ofproto import inet
from ryu.lib.ip import ipv4_to_bin
from ryu.services.protocols.bgp.model import PrefixList


AS_NUMBER = 65000
ROUTER_ID = '10.0.0.1'

app_manager.require_app('ryu.app.rest_router')

class BGPRouter(RyuApp):
#    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    _CONTEXTS = {'wsgi': WSGIApplication}

    def __init__(self, *args, **kwargs):
        super(BGPRouter, self).__init__(*args, **kwargs)
        self.speaker = BGPSpeaker(AS_NUMBER, ROUTER_ID, best_path_change_handler=self._path_changed)
        self._add_neighbor('172.16.6.101', 65000, '192.168.31.172')
        self.logger.info('CONTEXTS')
        self.logger.info(self._CONTEXTS)
        self.wsgi = kwargs['wsgi']

    def _path_changed(self, ev):
        withdraw = ev.is_withdraw
        nexthop = ev.nexthop
        prefix = ev.prefix
        self.logger.info('path_changed withdraw=%s prefix=%s nexthop=%s', withdraw, prefix, nexthop)

    def _add_neighbor(self, ipaddress, as_number, next_hop):
        self.speaker.neighbor_add(ipaddress, as_number, next_hop=next_hop)
        self.speaker.prefix_add('10.5.111.0/24')
        self.speaker.prefix_add('10.5.112.0/24')
        self._neighbor_config(ipaddress)

    def _neighbor_config(self, ipaddress):
        pList1 = PrefixList('10.5.111.0/24',policy=PrefixList.POLICY_DENY)
        pList2 = PrefixList('10.5.112.0/24',policy=PrefixList.POLICY_PERMIT)
        self.speaker.out_filter_set(ipaddress, [pList1, pList2])

    def _add_prefix(self, prefix, next_hop):
        for router in self.router_list:
            param = {"destination": prefix, "gateway": next_hop}
            waiters = {}
            msg = router.set_data(0, param, waiters)
            self.logger.info(msg)


