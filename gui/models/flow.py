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
import json
import httplib

import gevent
import gevent.monkey
gevent.monkey.patch_all()

LOG = logging.getLogger('ryu.gui')


class FlowWatcher(object):
    _LOOP_WAIT = 3
    _REST_RETRY_WAIT = 10
    _SWITCHES_PATH = '/stats/switches'
    _FLOW_PATH_BASE = '/stats/flow/'

    def __init__(self, update_handler=None, rest_error_handler=None):
        self.update_handler = update_handler
        self.rest_error_handler = rest_error_handler
        self.address = None

        self.dpids = []  # list of dpid (from /stats/switches)
        self.flows = {}  # dict: dpid -> flows (/stats/flow/<dpid>)
        self.threads = []

    def start(self, address):
        LOG.debug('FlowWatcher: start')
        self.address = address
        self.is_active = True
        self.threads.append(gevent.spawn(self._polling_loop))

    def stop(self):
        LOG.debug('FlowWatcher: stop')
        self.is_active = False

    def get_flows(self, dpid=None):
        if dpid is None:
            return self.flows

        assert type(dpid) == int
        return self.flows.get(dpid)

    def _polling_loop(self):
        LOG.debug('FlowWatcher: Enter polling loop')
        while self.is_active:
            try:
                self._polling_switches()
                self._polling_flows()
            except (IOError, httplib.HTTPException) as e:
                LOG.debug('FlowWatcher: REST API(%s) is not avaliable. wait %d secs...' %
                      (self.address, self._REST_RETRY_WAIT))
                self._call_rest_error_handler(e)
                gevent.sleep(self._REST_RETRY_WAIT)
                continue

            gevent.sleep(self._LOOP_WAIT)

    def _polling_switches(self):
        path = self._SWITCHES_PATH
        switches_json = self._do_request(path).read()
        dpids = json.loads(switches_json)
        self.dpids = dpids
    
    def _polling_flows(self):
        for dpid in self.dpids:
            path = '%s%d' % (self._FLOW_PATH_BASE, dpid)
            flow_json = self._do_request(path).read()
            flows = json.loads(flow_json)[str(dpid)]
            self.flows[dpid] = flows

    def _do_request(self, path):
        conn = httplib.HTTPConnection(self.address)
        conn.request('GET', path)
        res = conn.getresponse()
        if res.status in (httplib.OK,
                          httplib.CREATED,
                          httplib.ACCEPTED,
                          httplib.NO_CONTENT):
            return res

        raise httplib.HTTPException(
            res, 'code %d reason %s' % (res.status, res.reason),
            res.getheaders(), res.read())

    def _call_rest_error_handler(self, e):
        if self.rest_error_handler:
            self.rest_error_handler(self.address, e)

    def _call_update_handler(self, delta):
        # Not Implemented yet
        pass

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    watcher = FlowWatcher()
    watcher.start('127.0.0.1:8080')
    gevent.joinall(watcher.threads)
