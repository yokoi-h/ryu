import logging
import gevent
import json
from flask import g, request

import view_base
from models import TopologyWatcher

LOG = logging.getLogger('ryu.gui')


class EventBase(dict):
    def __init__(self):
        super(EventBase, self).__init__()
        self['event'] = self.__class__.__name__
        self['body'] = {}

    def set_body(self, **body):
        for name, value in body.items():
            self['body'][name] = value


class EventAddSwitch(EventBase):
    def __init__(self):
        super(EventAddSwitch, self).__init__()


class EventDelSwitch(EventBase):
    def __init__(self):
        super(EventDelSwitch, self).__init__()


class EventAddPort(EventBase):
    def __init__(self):
        super(EventAddPort, self).__init__()


class EventDelPort(EventBase):
    def __init__(self):
        super(EventDelPort, self).__init__()


class EventAddLink(EventBase):
    def __init__(self):
        super(EventAddLink, self).__init__()


class EventDelLink(EventBase):
    def __init__(self):
        super(EventDelLink, self).__init__()


class EventRestConnectErr(EventBase):
    def __init__(self):
        super(EventRestConnectErr, self).__init__()


class WebsocketView(view_base.ViewBase):
    def __init__(self, ws):
        super(WebsocketView, self).__init__()
        self.ws = ws
        self.watcher = TopologyWatcher(update_handler=self.update_handler,
                        rest_error_handler=self.rest_error_handler)

    def run(self):
        LOG.info('Websocket: connected')
        while True:
            msg = self.ws.receive()
            if msg is not None:
                self._received(msg)
            else:
                self.watcher.stop()
                break

        self.ws.close()
        LOG.info('Websocket: closed.')
        return self.null_response()

    # called by watcher when topology update
    def update_handler(self, address, delta):
        [host, port] = address.split(':')

        LOG.debug('added switches: %s' % delta.added['switches'])
        LOG.debug('added ports: %s' % delta.added['ports'])
        LOG.debug('added links: %s' % delta.added['links'])
        LOG.debug('deleted switches: %s' % delta.deleted['switches'])
        LOG.debug('deleted ports: %s' % delta.deleted['ports'])
        LOG.debug('deleted links: %s' % delta.deleted['links'])

    # called by watcher when rest api error
    def rest_error_handler(self, address, e):
        [host, port] = address.split(':')

        LOG.debug('REST API Error: %s' % e)

    def _received(self, msg):
        LOG.debug('Websocket: received %s', msg)
        try:
            ev = json.loads(msg)
        except:
            LOG.debug("json parse error: %s", msg)
            return

        event = ev.get('event')
        body = ev.get('body')
        if event == 'EventRestUrl':
            self._watcher_start(body)
        elif event == 'EventLookingSwitch':
            self.discovery.looking_switch = body.get('dpid')
        else:
            return

    def _watcher_start(self, body):
        address = '%s:%s' % (body['host'], body['port'])
        self.watcher.start(address)


class TopologyDiscovery(object):
    def __init__(self, ws):
        self.ws = ws
        self.threads = []
        self.is_active = False
        self.model = None
        self.looking_switch = None
    
    def connect(self, host, port):
        # TODO get model
        self.model = {}
        LOG.debug("REST connected. %s:%s", host, port)
        return True

    def send_event(self, ev):
        LOG.debug("Websocket: send msg. %s", ev)
        self.ws.send(json.dumps(ev))

    def start(self):
        self.is_active = True
        self.threads.append(
            gevent.spawn_later(0, self._topology_discovery))

    def _topology_discovery(self):
        cnt = 1
        while self.is_active:
            if self.is_active:
                # add switch test
                if 1 <= cnt <= 5:
                    ev = EventAddSwitch()
                    name = 's' + str(cnt)
                    ports = {}
                    for i in range(1, 5):
                        port = {}
                        port['dpid'] = cnt
                        port['port_no'] = i
                        port['name'] = 's' + str(cnt) + '-eth' + str(i)
                        port['peer'] = {'dpid': 0, 'port_no': 0}
                        ports[i] = port
                    ev.set_body(dpid=cnt, name=name, ports=ports)
                    self.send_event(ev)
#                # del switch
#                elif cnt <= 6:
#                    ev = EventDelSwitch()
#                    ev.set_body(dpid=5)
#                    self.send_event(ev)
                # add port
                elif cnt == 6:
                    ev = EventAddPort()
                    ev.set_body(dpid=1, port_no=6, name="s1-eth6", peer={'dpid': 0, 'port_no': 0})
                    self.send_event(ev)
                # del port
                elif cnt == 7:
                    ev = EventDelPort()
                    ev.set_body(dpid=1, port_no=6)
                    self.send_event(ev)
                # add link
                elif cnt == 8:
                    ev = EventAddLink()
                    p1 = {}
                    p1['dpid'] = cnt - 7
                    p1['port_no'] = 1
                    p2 = {}
                    p2['dpid'] = cnt - 5
                    p2['port_no'] = 2
                    ev.set_body(p1=p1, p2=p2)
                    self.send_event(ev)
                elif cnt == 9:
                    ev = EventAddLink()
                    p1 = {}
                    p1['dpid'] = cnt - 7
                    p1['port_no'] = 1
                    p2 = {}
                    p2['dpid'] = cnt - 5
                    p2['port_no'] = 2
                    ev.set_body(p1=p1, p2=p2)
                    self.send_event(ev)
                # del link
                elif cnt == 10:
                    ev = EventDelLink()
                    p1 = {}
                    p1['dpid'] = cnt - 9
                    p1['port_no'] = 1
                    p2 = {}
                    p2['dpid'] = cnt - 7
                    p2['port_no'] = 2
                    ev.set_body(p1=p1, p2=p2)
                    self.send_event(ev)
                elif cnt == 11:
                    ev = EventDelLink()
                    p1 = {}
                    p1['dpid'] = cnt - 9
                    p1['port_no'] = 1
                    p2 = {}
                    p2['dpid'] = cnt - 7
                    p2['port_no'] = 2
                    ev.set_body(p1=p1, p2=p2)
                    self.send_event(ev)
                cnt += 1
            #if cnt > 7:
            if cnt > 0:
                gevent.sleep(5)
