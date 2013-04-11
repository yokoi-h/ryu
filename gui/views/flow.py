# Copyright (C) 2013 Nippon Telegraph and Telephone Corporation.
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

import re
import logging

import view_base
from models import proxy


LOG = logging.getLogger('ryu.gui')


class FlowView(view_base.ViewBase):
    def __init__(self, host, port, dpid, flows=None):
        super(FlowView, self).__init__()
        self.host = host
        self.port = port
        self.dpid = dpid
        self.flows = flows

    def run(self):
        if not self.flows:
            # dump flows
            return self._dump_flows()

        # TODO: flow-mod
        return self.null_response()

    def _dump_flows(self):
        address = '%s:%s' % (self.host, self.port)
        flows = proxy.get_flows(address, int(self.dpid))

        res = {'host': self.host,
               'port': self.port,
               'dpid': self.dpid,
               'flows': []}

        for flow in flows:
            actions = self._to_client_actions(flow.pop('actions'))
            rules = self._to_client_rules(flow.pop('match'))
            stats = self._to_client_stats(flow)
            res['flows'].append({'stats': stats,
                                 'rules': rules,
                                 'actions': actions})
        return self.json_response(res)

    def _to_client_actions(self, actions):
        # TODO:XXX
        return actions

    def _to_client_rules(self, rules):
        for name, val in rules.items():
            if self._is_default(val):
                del rules[name]
        return rules

    def _to_client_stats(self, stats):
        required = [
            'duration_sec',
            'duration_nsec',
            'table_id',
            'priority',
            'packet_count',
            'byte_count',
        ]
        for name, val in stats.items():
            if not name in required:
                if self._is_default(val):
                    del stats[name]
        return stats

    def _is_default(self, val):
        return re.search('^[0:\.]+$', str(val))
