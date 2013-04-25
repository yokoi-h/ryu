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

from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import MAIN_DISPATCHER, CONFIG_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.lib.mac import haddr_to_str
from ryu.ofproto import ofproto_v1_3
from ryu.ofproto.ofproto_v1_2 import OFPG_ANY


class SimpleSwitch(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    def __init__(self, *args, **kwargs):
        super(SimpleSwitch, self).__init__(*args, **kwargs)
        self.mac_to_port = {}

    def add_flow(self, datapath, in_port, dst, actions):
        parser = datapath.ofproto_parser

        match = parser.OFPMatch()
        match.set_in_port(in_port)
        match.set_dl_dst(dst)

        instruction = [parser.OFPInstructionActions(
                  ofproto_v1_3.OFPIT_APPLY_ACTIONS, actions)]
        priority = 1
        flow_mod_message = self.create_flow_mod_message(
                    datapath, match, priority, instruction)
        datapath.send_msg(flow_mod_message)

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def _packet_in_handler(self, ev):
        msg = ev.msg
        datapath = msg.datapath
        parser = datapath.ofproto_parser
        dpid = datapath.id
        self.mac_to_port.setdefault(dpid, {})

        # get in_port, source and destination mac address.
        for f in msg.match.fields:
            if f.header == ofproto_v1_3.OXM_OF_IN_PORT:
                in_port = f.value
            if f.header == ofproto_v1_3.OXM_OF_ETH_SRC:
                src = f.value
            if f.header == ofproto_v1_3.OXM_OF_ETH_DST:
                dst = f.value

        self.logger.info("packet in %s %s %s %s",
                         dpid, haddr_to_str(src), haddr_to_str(dst), in_port)

        # learn a mac address to avoid FLOOD next time.
        self.mac_to_port[dpid][src] = in_port

        if dst in self.mac_to_port[dpid]:
            out_port = self.mac_to_port[dpid][dst]
        else:
            out_port = ofproto_v1_3.OFPP_ALL
            self.logger.info("FLOOD")

        actions = [
            parser.OFPActionOutput(out_port, ofproto_v1_3.OFPCML_NO_BUFFER)]

        # install a flow to avoid packet_in next time
        if out_port is not ofproto_v1_3.OFPP_ALL:
            self.add_flow(datapath, in_port, dst, actions)

        packet_out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=0xffffffff,
            in_port=in_port,
            actions=actions,
            data=msg.data)

        datapath.send_msg(packet_out)

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def _switch_features_handler(self, ev):
        datapath = ev.msg.datapath
        parser = datapath.ofproto_parser
        match = parser.OFPMatch()

        out_port = parser.OFPActionOutput(ofproto_v1_3.OFPP_CONTROLLER,
                                          ofproto_v1_3.OFPCML_NO_BUFFER)
        write_action = parser.OFPInstructionActions(
                            ofproto_v1_3.OFPIT_APPLY_ACTIONS, [out_port])
        instruction = [write_action]
        datapath.send_msg(self.create_flow_mod_message(datapath,
                        match, 0, instruction))

    def create_flow_mod_message(self, datapath, match, priority, instruction):
        parser = datapath.ofproto_parser
        flow_mod_message = parser.OFPFlowMod(
            datapath=datapath,
            cookie=0, cookie_mask=0, table_id=0,
            command=ofproto_v1_3.OFPFC_ADD,
            idle_timeout=0, hard_timeout=0, priority=priority,
            buffer_id=0xffffffff,  # OFP_NO_BUFFER=0xffffffff
            out_port=ofproto_v1_3.OFPP_ANY,
            out_group=OFPG_ANY,
            flags=0,
            match=match,
            instructions=instruction)

        return flow_mod_message
