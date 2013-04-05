import logging
import gevent
import json

import view_base
from models.topology import TopologyWatcher

LOG = logging.getLogger('ryu.gui')


class WebsocketView(view_base.ViewBase):
    def __init__(self, ws):
        super(WebsocketView, self).__init__()
        self.ws = ws
        self.address = None
        self.topo = {}
        self.watcher = TopologyWatcher(update_handler=self.update_handler,
                        rest_error_handler=self.rest_error_handler)

    def run(self):
        while True:
            msg = self.ws.receive()
            if msg is not None:
                try:
                    msg = json.loads(msg)
                except:
                    LOG.debug("json parse error: %s", msg)
                    continue
                self._recv_message(msg)
            else:
                self.watcher.stop()
                break

        self.ws.close()
        LOG.info('Websocket: closed.')
        return self.null_response()

#    def _send_message(self, msg_name, address, **body):
    def _send_message(self, msg_name, address, body=None):
        message = {}
        message['message'] = msg_name
        message['host'], message['port'] = address.split(':')
        message['body'] = body
        LOG.debug("Websocket: send msg.\n%s", json.dumps(message, indent=2))
        self.ws.send(json.dumps(message))

    def _recv_message(self, msg):
        LOG.debug('Websocket: recv msg.\n%s', json.dumps(msg, indent=2))

        message = msg.get('message')
        body = msg.get('body')

        if message == 'rest_update':
            self._watcher_start(body)
        elif message == 'watching_switch_update':
            self._watching_switch_update(body)
        else:
            return

    def _watcher_start(self, body):
        address = '%s:%s' % (body['host'], body['port'])
        self.address = address
        if self.watcher:
            self.watcher.stop()

        self.watcher = TopologyWatcher(update_handler=self.update_handler,
                        rest_error_handler=self.rest_error_handler)
        self.topo = {}
        self.watcher.start(address)

    def _watching_switch_update(self, body):
        # if dpid:
        #     #TODO: get flows
        pass

    # called by watcher when topology update
    def update_handler(self, address, delta):
        if self.address != address:
            # user be watching the another controller already
            return

        LOG.debug(delta)
        self._send_message('rest_connected', address)
        self._send_del_links(address, delta.deleted)
        self._send_del_ports(address, delta.deleted)
        self._send_del_switches(address, delta.deleted)
        self._send_add_switches(address, delta.added)
        self._send_add_ports(address, delta.added)
        self._send_add_links(address, delta.added)

    def _send_add_switches(self, address, topo):
        body = self._build_switches_message(topo)
        if body:
            self._send_message('add_switches', address, body)

    def _send_del_switches(self, address, topo):
        body = self._build_switches_message(topo)
        if body:
            self._send_message('del_switches', address, body)

    def _build_switches_message(self, topo):
        body = []
        for s in topo['switches']:
            S = {'dpid': s.dpid, 'ports': {}}
            for p in s.ports:
                S['ports'][p.port_no] = p.to_dict()

            body.append(S)

        return body

    def _send_add_ports(self, address, topo):
        body = self._build_ports_message(topo)
        if body:
            self._send_message('add_ports', address, body)

    def _send_del_ports(self, address, topo):
        body = self._build_ports_message(topo)
        if body:
            self._send_message('del_ports', address, body)

    def _build_ports_message(self, topo):
        # send only except new added switches
        ports = set(topo['ports'])
        for s in topo['switches']:
            ports -= set(s.ports)

        body = []
        for p in ports:
            body.append(p.to_dict())

        return body

    def _send_add_links(self, address, topo):
        body = self._build_links_message(topo)
        if body:
            self._send_message('add_links', address, body)

    def _send_del_links(self, address, topo):
        body = self._build_links_message(topo)
        if body:
            self._send_message('del_links', address, body)

    def _build_links_message(self, topo):
        body = []
        for link in topo['links']:
            # handle link as undirected
            if link.src.dpid > link.dst.dpid:
                continue

            p1 = link.src.to_dict()
            p2 = link.dst.to_dict()
            L = {'p1': p1.copy(), 'p2': p2.copy()}
            L['p1']['peer'] = p2.copy()
            L['p2']['peer'] = p1.copy()
            
            body.append(L)

        return body
    
    def _update_switches(self, added, deleted):
        send = {}
        send['added'] = []
        for a in added:
            if not self._is_topo([a.dpid]):
                self.topo[a.dpid] = a.to_dict()
                ports = {}
                for p in a.ports:
                    ports[p.port_no] = p.to_dict()
                    ports[p.port_no]['peer'] = {}
                self.topo[a.dpid]['ports'] = ports
                # TODO: has not name...
                self.topo[a.dpid]['name'] = 's' + str(a.dpid)
                send['added'].append(a)

        send['deleted'] = []
        for d in deleted:
            del self.topo[d.dpid]
            send['deleted'].append(d)
        return send

    def _update_ports(self, added, deleted):
        send = {}
        send['added'] = []
        for a in added:
            if not self._is_topo([a.dpid, 'ports', a.port_no]):
                self.topo[a.dpid]['ports'][a.port_no] = a.to_dict()
                self.topo[a.dpid]['ports']['peer'] = {}
                send['added'].append(a)

        send['deleted'] = []
        for d in deleted:
            if self._is_topo([d.dpid, 'ports', d.port_no]):
                del self.topo[d.dpid]['ports'][d.port_no]
                send['deleted'].append(d)
        return send

    def _update_links(self, added, deleted):
        send = {}
        send['added'] = []
        for a in added:
            if not self._is_topo([a.src.dpid, 'ports', a.src.port_no, 'peer']):
                self.topo[a.src.dpid]['ports'] \
                    [a.src.port_no]['peer'] = a.dst.to_dict()
                if self._is_topo([a.dst.dpid, 'ports', a.dst.port_no, 'peer']):
                    send['added'].append(a)

        send['deleted'] = []
        for d in deleted:
            need = 0
            if self._is_topo([d.src.dpid, 'ports', d.src.port_no, 'peer']):
                self.topo[d.src.dpid]['ports'][d.src.port_no]['peer'] = {}
                need += 1
            if self._is_topo([d.dst.dpid, 'ports', d.dst.port_no, 'peer']):
                self.topo[d.dst.dpid]['ports'][d.dst.port_no]['peer'] = {}
                need += 1
            if need == 2:
                send['deleted'].append(d)
        return send

    def _is_topo(self, keyes):
        val = self.topo
        for key in keyes:
            val = val.get(key, {})
        return val

    def _send_delta(self, address, send):
        self._send_message('rest_connected', address)
        body = []
        for s in send['switches']['added']:
            body.append(self._is_topo([s.dpid]))
        if body:
            self._send_message('add_switches', address, body)

        body = [{'dpid': s.dpid} for s in send['switches']['deleted']]
        if body:
            self._send_message('del_switches', address, body)

        body = []
        for p in send['ports']['added']:
            body.append(self._is_topo([p.dpid, 'ports', p.port_no]))
        if body:
            self._send_message('add_ports', address, body)

        body = []
        for p in send['ports']['deleted']:
            body.append({'dpid': p.dpid, 'port_no': p.port_no})
        if body:
            self._send_message('del_ports', address, body)

        body = []
        for l in send['links']['added']:
            p1 = self._is_topo([l.src.dpid, 'ports', l.src.port_no])
            p2 = self._is_topo([l.dst.dpid, 'ports', l.dst.port_no])
            body.append({'p1': p1, 'p2': p2})
        if body:
            self._send_message('add_links', address, body)

        body = []
        for l in send['links']['deleted']:
            p1 = l.src.to_dict()
            p2 = l.dst.to_dict()
            body.append({'p1': p1, 'p2': p2})
        if body:
            self._send_message('del_links', address, body)


    # called by watcher when rest api error
    def rest_error_handler(self, address, e):
        LOG.debug('REST API Error: %s' % e)
        [host, port] = address.split(':')
        self._send_message('rest_disconnected', address)
