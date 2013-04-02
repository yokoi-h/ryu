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
        res = {}
        res['host'] = self.host
        res['port'] = self.port
        res['dpid'] = self.dpid
        res['flows'] = []

        for flow in flows:
            actions = []
            rules = []
            stats = []
            duration = 0
            for name, val in flow.items():
                if name == 'actions':
                    actions = val
                elif name == 'match':
                    for rule, v in val.items():
                        rules.append(rule + '=' + str(v))
                else:
                    stats.append(name + '=' + str(val))
            res['flows'].append(', '.join(stats + rules + actions))
#            res['flows'].append({'stats': ', '.join(stats),
#                                 'rules': ', '.join(rules),
#                                 'actions': ', '.join(actions)})
        return self.json_response(res)
