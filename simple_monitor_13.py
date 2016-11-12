from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER, DEAD_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.ofproto import ofproto_v1_3
from ryu.lib.packet import packet
from ryu.lib.packet import ethernet
from ryu.lib.packet import ether_types

from operator import attrgetter

from ryu.lib import hub

from ryu.app.custom_message import PortMessage, DPIMessage
from ryu.topology.api import get_switch, get_link, get_host
import json
import requests
import Queue

import collections

from ryu.topology import event, switches
from ryu.lib.port_no import str_to_port_no
from ryu.lib.dpid import str_to_dpid, dpid_to_str

import datetime, time

from ryu.app.wsgi import ControllerBase, WSGIApplication, route
from webob import Response
import re
from ryu.app.wsgi import (
    ControllerBase,
    WSGIApplication,
    websocket,
    WebSocketRPCClient
)

class SimpleMonitor(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    _CONTEXTS = {
        'wsgi': WSGIApplication,
        'switches': switches.Switches,
    }

    _EVENTS = [PortMessage, DPIMessage]
    BANDWIDTH_LIMIT = 1024*1024*1024
    PORT_REQ_INTERVAL = 1
    DPI_REQ_INTERVAL = 1

    def __init__(self, *args, **kwargs):
        super(SimpleMonitor, self).__init__(*args, **kwargs)
        self.mac_to_port = {}
        self.datapaths = {}
        self.monitor_thread = hub.spawn(self._port_monitor)
        self.lastState = {}
        # switch port_no to port mac
        self.swPort_to_mac = {}
        # dpid with port no to next dpid
        self.swPort_to_dpid = {}
        self.border_mac = set()
        self.dpiq = Queue.Queue()

        # dpi recorder
        self.proto_acc = {'Yahoo': 0, 'Facebook': 0, 'Google': 0}


        # mac, ip, port => dpi server info
        # port_no, dpid, name => dp info which connecting to dpi server
        self.dpi_info = {'mac': None, 'port_no': None, 'dpid': None, 'name': None, 'ip': None, 'port': None, 'tree': None}

        wsgi = kwargs['wsgi']
        wsgi.register(ResponseController, {'response_app': self})

    ############################################
    ## clone from simple_switch_13 and modify ##
    ############################################

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features_handler(self, ev):
        datapath = ev.msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        # install table-miss flow entry
        #
        # We specify NO BUFFER to max_len of the output action due to
        # OVS bug. At this moment, if we specify a lesser number, e.g.,
        # 128, OVS will send Packet-In with invalid buffer_id and
        # truncated packet data. In that case, we cannot output packets
        # correctly.  The bug has been fixed in OVS v2.1.0.
        match = parser.OFPMatch()
        actions = [parser.OFPActionOutput(ofproto.OFPP_CONTROLLER,
                                          ofproto.OFPCML_NO_BUFFER)]
        self.add_flow(datapath, 0, match, actions)

    def add_flow(self, datapath, priority, match, actions, buffer_id=None, idle_timeout=None):
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS,
                                             actions)]
        if buffer_id:
            mod = parser.OFPFlowMod(datapath=datapath, buffer_id=buffer_id,
                                    priority=priority, match=match,
                                    instructions=inst)
        elif idle_timeout:
            mod = parser.OFPFlowMod(datapath=datapath, priority=priority,
                                    match=match, instructions=inst, idle_timeout=idle_timeout, flags=ofproto.OFPFF_SEND_FLOW_REM)
        else:
            mod = parser.OFPFlowMod(datapath=datapath, priority=priority,
                                    match=match, instructions=inst)
        datapath.send_msg(mod)

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def _packet_in_handler(self, ev):
        # If you hit this you might want to increase
        # the "miss_send_length" of your switch
        if ev.msg.msg_len < ev.msg.total_len:
            self.logger.debug("packet truncated: only %s of %s bytes",
                              ev.msg.msg_len, ev.msg.total_len)
        msg = ev.msg
        datapath = msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        in_port = msg.match['in_port']

        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocols(ethernet.ethernet)[0]

        if eth.ethertype == ether_types.ETH_TYPE_LLDP:
            # ignore lldp packet
            return
        dst = eth.dst
        src = eth.src

        dpid = datapath.id
        self.mac_to_port.setdefault(dpid, {})

        # self.logger.info("packet in %s %s %s %s", dpid, src, dst, in_port)

        # learn a mac address to avoid FLOOD next time.
        self.mac_to_port[dpid][src] = in_port

        if dst in self.mac_to_port[dpid]:
            out_port = self.mac_to_port[dpid][dst]
        else:
            out_port = ofproto.OFPP_FLOOD

        # if the dpi server is on. forward copys of packet.
        if self.dpi_info['dpid'] and self.dpi_info['port_no'] and int(self.dpi_info['dpid'])==dpid:
            actions = [parser.OFPActionOutput(out_port), parser.OFPActionOutput(int(self.dpi_info['port_no']))]
        else:
            actions = [parser.OFPActionOutput(out_port)]

        # install a flow to avoid packet_in next time
        if out_port != ofproto.OFPP_FLOOD:
            match = parser.OFPMatch(in_port=in_port, eth_dst=dst)
            # verify if we have a valid buffer_id, if yes avoid to send both
            # flow_mod & packet_out
            if msg.buffer_id != ofproto.OFP_NO_BUFFER:
                self.add_flow(datapath, 1, match, actions, msg.buffer_id)
                return
            else:
                self.add_flow(datapath, 1, match, actions)
        data = None
        if msg.buffer_id == ofproto.OFP_NO_BUFFER:
            data = msg.data

        out = parser.OFPPacketOut(datapath=datapath, buffer_id=msg.buffer_id,
                                  in_port=in_port, actions=actions, data=data)
        
        datapath.send_msg(out)

    # XXX: Can't handle mod flow very well.
    # This function will del all flows from the table currently.
    def del_flows(self, datapath, match, strict=False):
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        cmd = ofproto.OFPFC_DELETE
        if strict:
            cmd = ofproto.OFPFC_DELETE_STRICT

        mod = parser.OFPFlowMod(datapath=datapath,
                                command=cmd,
                                match=match,out_port=ofproto.OFPP_ANY, out_group=ofproto.OFPG_ANY)
        datapath.send_msg(mod)

    ###################
    ## handle events ##
    ###################

    @set_ev_cls(ofp_event.EventOFPStateChange,
                [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def _state_change_handler(self, ev):
        datapath = ev.datapath
        if ev.state == MAIN_DISPATCHER:
            if not datapath.id in self.datapaths:
                self.logger.debug('register datapath: %016x', datapath.id)
                self.datapaths[datapath.id] = datapath
        elif ev.state == DEAD_DISPATCHER:
            if datapath.id in self.datapaths:
                self.logger.debug('unregister datapath: %016x', datapath.id)
                del self.datapaths[datapath.id]

    @set_ev_cls(event.EventSwitchEnter)
    def _event_switch_enter_handler(self, ev):
        msg = ev.switch.to_dict()
        dpid = str_to_dpid(msg['dpid'])
        self.swPort_to_mac.setdefault(dpid, {})
        self.swPort_to_dpid.setdefault(dpid, {})
        for port in msg['ports']:
            port_no = str_to_port_no(port['port_no'])
            self.swPort_to_mac[dpid][port_no] = port['hw_addr']
            self.border_mac.add(port['hw_addr'])

    @set_ev_cls(event.EventSwitchLeave)
    def _event_switch_leave_handler(self, ev):
        msg = ev.switch.to_dict()
        # add port if not in border_mac
        # del port if in border_mac

    @set_ev_cls(event.EventLinkAdd)
    def _event_link_add_handler(self, ev):
        msg = ev.link.to_dict()
        src_dpid = str_to_dpid(msg['src']['dpid'])
        dst_dpid = str_to_dpid(msg['dst']['dpid'])

        ## border dpid detection
        if src_dpid < dst_dpid:
            src_hw_addr = msg['src']['hw_addr']
            dst_hw_addr = msg['dst']['hw_addr']
            if src_hw_addr in self.border_mac:
                self.border_mac.remove(src_hw_addr)
            if dst_hw_addr in self.border_mac:
                self.border_mac.remove(dst_hw_addr)

        ## create swPort_to_dpid
        self.swPort_to_dpid[src_dpid][int(msg['src']['port_no'])] = dst_dpid

    @set_ev_cls(event.EventLinkDelete)
    def _event_link_delete_handler(self, ev):
        msg = ev.link.to_dict()
        # do nothing

    #############
    ## Monitor ##
    #############

    def _port_monitor(self):
        while True:
            for dp in self.datapaths.values():
                # XXX: handle multiple dpi with queue (sync)
                self._request_stats(dp)
            hub.sleep(SimpleMonitor.PORT_REQ_INTERVAL)

            # try to create a topo graph
            # hosts = get_host(self)
            # body = json.dumps([host.to_dict() for host in hosts])
            # print body

            # print "*******************  border_mac  *****************************"
            # print self.border_mac

            # send event to observers
            # this is a testing event, which will be caught by ws_topology app

    def _request_stats(self, datapath):
        self.logger.debug('send stats request: %016x', datapath.id)
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        if not self.dpiq.empty():
            # remove dpi ref. and start thread
            self.dpiq.get()
            self.dpi_thread = hub.spawn(self._dpi_monitor)

        req = parser.OFPFlowStatsRequest(datapath)
        datapath.send_msg(req)

        req = parser.OFPPortStatsRequest(datapath, 0, ofproto.OFPP_ANY)
        datapath.send_msg(req)

    @set_ev_cls(ofp_event.EventOFPFlowStatsReply, MAIN_DISPATCHER)
    def _flow_stats_reply_handler(self, ev):
        body = ev.msg.body
        # print "****************** flow state body ****************************"
        # print body

        # self.logger.info('datapath         '
                         # 'in-port  eth-dst           '
                         # 'out-port packets  bytes')
        # self.logger.info('---------------- '
                         # '-------- ----------------- '
                         # '-------- -------- --------')
        # # list conprehension
        # for stat in sorted([flow for flow in body if flow.priority == 1],
                           # key=lambda flow: (flow.match['in_port'],
                                             # flow.match['eth_dst'])):
            # self.logger.info('%016x %8x %17s %8x %8d %8d',
                             # ev.msg.datapath.id,
                             # stat.match['in_port'], stat.match['eth_dst'],
                             # stat.instructions[0].actions[0].port,
                             # stat.packet_count, stat.byte_count)

        # detect warning bandwidth    
        msg = ev.msg
        dpid = msg.datapath.id
        datapath = self.datapaths[dpid]
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        # for stat in sorted([flow for flow in body if flow.priority == 1],
                           # key=lambda flow: (flow.match['in_port'],
                                             # flow.match['eth_dst'])):
            # key = "%d, %d:%d" % (dpid, stat.match['in_port'], stat.instructions[0].actions[0].port)
            # if key in self.lastState:
                # if (stat.byte_count-self.lastState[key])//SimpleMonitor.PORT_REQ_INTERVAL>SimpleMonitor.BANDWIDTH_LIMIT:
                    # # send Message to websocket
                    # print "Exceed warning bandwidth at %016x %s %13s B => %13s B" % (ev.msg.datapath.id, key, self.lastState[key], stat.byte_count)

                    # # send modflow to dpid => try drop all packets recv from in_port
                    # in_port = stat.match['in_port']
                    # inport_mac = self.swPort_to_mac[dpid][in_port]
                    # # drop only in the border switch
                    # if inport_mac in self.border_mac:
                        # match = parser.OFPMatch(in_port=stat.match['in_port'])
                        # actions = []
                        # super(SimpleMonitor, self).add_flow(datapath=datapath, priority=2, match=match, actions=actions, idle_timeout=10)
                        # # send message to ws
                        # ev_msg = {'dpid': dpid, 'inport_mac': inport_mac}
                        # event = EventMessage(ev_msg)
                        # self.send_event_to_observers(event)
                        # # show warning message on console
                        # print "Drop dpid: %d, in_port %d" % (dpid, in_port)
            # # if key in self.lastState:
                # # print self.lastState[key], "   ", stat.byte_count
            # self.lastState[key] = stat.byte_count

    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def _port_stats_reply_handler(self, ev):
        body = ev.msg.body
        # print "****************** port state body ****************************"
        # print "check dpid " + dpid_to_str(ev.msg.datapath.id).lstrip('0')
        # print body

        # self.logger.info('datapath         port     '
                         # 'rx-pkts  rx-bytes rx-error '
                         # 'tx-pkts  tx-bytes tx-error')
        # self.logger.info('---------------- -------- '
                         # '-------- -------- -------- '
                         # '-------- -------- --------')
        # for stat in sorted(body, key=attrgetter('port_no')):
            # self.logger.info('%016x %8x %8d %8d %8d %8d %8d %8d', 
                             # ev.msg.datapath.id, stat.port_no,
                             # stat.rx_packets, stat.rx_bytes, stat.rx_errors,
                             # stat.tx_packets, stat.tx_bytes, stat.tx_errors)


        # get port traffic info.
        # XXX: not consider overflow condition yet. 
        # Openflow 1.3 use counter that is wrap around with no overflow indicator. 
        dpid = dpid_to_str(ev.msg.datapath.id).lstrip('0')
        d = datetime.datetime.utcnow()
        ts_for_js = int(time.mktime(d.timetuple())) * 1000
        ev_msg = {'dpid': dpid, 'port_info': [], 'ts': ts_for_js}
        for stat in sorted(body, key=attrgetter('port_no')):
            ev_msg['port_info'].append({'port_no': stat.port_no,
                                        'rx_pkt': stat.rx_packets, 'rx_byte': stat.rx_bytes,
                                        'tx_pkt': stat.tx_packets, 'tx_byte': stat.tx_bytes})
        event = PortMessage(ev_msg)
        self.send_event_to_observers(event)

    def udict2strdict(self, data):
        if isinstance(data, basestring):
            return str(data)
        elif isinstance(data, collections.Mapping):
            return dict(map(self.udict2strdict, data.iteritems()))
        elif isinstance(data, collections.Iterable):
            return type(data)(map(self.udict2strdict, data))
        else:
            return data

    def _dpi_monitor(self):
        """
        Send dpi request to server peroidically.
        Period = DPI_REQ_INTERVAL (default value is 5)
        """
        while True:
            # send a REST request to DPI server
            try:
                if self.dpi_info['ip']:
                    s = requests.session()
                    s.keep_alive = False
                    r = s.get('http://'+self.dpi_info['ip']+":"+self.dpi_info['port'])
                    res = r.json()
                    res['dpid'] = self.dpi_info['dpid']
                    res['period'] = SimpleMonitor.DPI_REQ_INTERVAL
                    event = DPIMessage(res)
                    self.send_event_to_observers(event)
            except:
                    # clear dpi and wait next connection
                    print("DPI disconnected..")
                    self.dpi_info = {'mac': None, 'port_no': None, 'dpid': None, 'name': None, 'ip': None, 'port': None, 'tree': None}
                    return

            # XXX: only check three protocols currently
            # print("DPI Request --------------\n")
            # res_info = {'Yahoo': 0, 'Facebook': 0, 'Google': 0}
            # for x in res.get('detected.protos', []):
                # if x['name'] == 'Yahoo':
                    # res_info['Yahoo'] = x['bytes']
                # if x['name'] == 'Facebook':
                    # res_info['Facebook'] = x['bytes']
                # if x['name'] == 'Google':
                    # res_info['Google'] = x['bytes']

            # with open("dpi_log.txt", "a") as dpioutput:
                # ts = time.time()
                # ts = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
                # dpioutput.write("Protocol\tBytes\t\t")
                # dpioutput.write(ts)
                # dpioutput.write("\nYahoo\t")
                # dpioutput.write("Facebook\t")
                # dpioutput.write("Google\n")
                # dpioutput.write(str(res_info["Yahoo"])+"\t")
                # dpioutput.write(str(res_info["Facebook"])+"\t")
                # dpioutput.write(str(res_info["Google"])+"\n")

            hub.sleep(SimpleMonitor.DPI_REQ_INTERVAL)
            pass

    ##############
    ##   REST   ##
    ##############

class ResponseController(ControllerBase):
    def __init__(self, req, link, data, **config):
        super(ResponseController, self).__init__(req, link, data, **config)
        self.response_app = data['response_app']

    @route('ForwardPath', '/ForwardPath/{src}/{dst}', methods=['GET'])
    def forward_path(self, req, **kwargs):
        # XXX: match flow enties instead

        src = kwargs['src']
        dst = kwargs['dst']
        hosts = get_host(self.response_app)

        # XXX: hard code => static mac address of gateway (NAT)
        ## find the first matching obj in the list
        src_host = next((x for x in hosts if x.ipv4[0] == src), None)
        dst_host = next((x for x in hosts if x.ipv4[0] == dst), None)
        if src_host is None:
            return Response(content_type='text/plain', body="Can not found the SRC")
        if dst_host is None:
            # return Response(content_type='text/plain', body="Wrong Dst")
            dst_mac = "00:00:00:ff:00:00"
        else:
            dst_mac = dst_host.mac

        print self.response_app.mac_to_port
        ## create path from src to dst
        # find the first dpid connecting to the host
        path = []
        next_dpid = src_host.port.dpid

        while True:
            path.append(next_dpid)
            # hop all dp on the path
            out_port = self.response_app.mac_to_port[next_dpid][dst_mac]
            next_dpid = self.response_app.swPort_to_dpid[next_dpid].get(out_port)
            if next_dpid is None:
                break

        # print "check swPort_to_dpid ------"
        # print self.response_app.swPort_to_dpid

        body = json.dumps(path)
        return Response(content_type='application/json', body=body)

    @route('dpi_tree', '/dpi_tree', methods=['GET'])
    def dpi_tree(self, req, **kwargs):
        # XXX: Only one dpi currently
        body = json.dumps(self.response_app.dpi_info['tree'])
        return Response(content_type='application/json', body=body)

    @route('dpi_init', '/dpi/connect', methods=['POST'])
    def dpi_init(self, req, **kwargs):
        # get post data
        post_data = req.text.split(",")
        try:
            hw_addr = post_data[0]
            ip_addr = post_data[1]
            dpi_port = post_data[2]
        except:
            return "DPI_POST_ERROR"

        if self.response_app.dpi_info['mac']:
            return "DPI_ALREADY_EXIST"
        else:
            # set dpi_info
            self.response_app.dpi_info['mac'] = hw_addr
            self.response_app.dpi_info['ip'] = ip_addr
            self.response_app.dpi_info['port'] = dpi_port

            # check whether the dpi is in network
            for host in get_host(self.response_app):
                host_dict = host.to_dict()
                if host_dict['mac'] == hw_addr:
                    self.response_app.dpi_info['dpid'] = host_dict['port']['dpid']
                    self.response_app.dpi_info['port_no'] = host_dict['port']['port_no']
                    self.response_app.dpi_info['name'] = host_dict['port']['name']
                    break
            else:
                print "DPI server not found??!"
                return "DPI_INIT_FAIL"

        # XXX: remove all datapaths' table. It's better to remove datapath which dpi server attached to.
        for dp in self.response_app.datapaths.values():
            ofproto = dp.ofproto
            parser = dp.ofproto_parser
            match = parser.OFPMatch()
            # remove all flows
            self.response_app.del_flows(dp, match)
            # add table miss
            actions = [parser.OFPActionOutput(ofproto.OFPP_CONTROLLER,
                                          ofproto.OFPCML_NO_BUFFER)]
            inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS, actions)]
            self.response_app.add_flow(dp, 0, match, actions)

        ### Create dpi tree when the dpi server connects to the Ryu controller
        # XXX: only for tree topology. It's better to resolve cyclic topology too.
        # XXX: not consider switch leave and enter situation
        # create the topology tree only with links data
        links = get_link(self.response_app, None)
        links = [link.to_dict() for link in links]
        links_r = []
        for x in links:
            a = int(x['src']['dpid'])
            b = int(x['dst']['dpid'])
            t = ()
            if a < b:
                t = (a, b)
            else:
                t  = (b, a)
            if t in links_r:
                continue
            else:
                links_r.append(t)
        #  print links_r

        rdpid = int(self.response_app.dpi_info['dpid'])
        tree = {rdpid: {'parent': None, 'child': []}}

        # tn_check is a list matains the dpid in the tree already
        tn_check = [rdpid]

        # try to create the tree
        while len(links_r)>0:
            for x in links_r:
                p = None
                if x[0] in tn_check:
                    p = x[0]
                    c = x[1]
                if p is not None and x[1] in tn_check:
                    c = x[0]
                    p = x[1]
                if p is not None:
                    tn_check.append(c)
                    tree[p]['child'].append(c)
                    tree[c] = {'parent': None, 'child': []} # init child node
                    tree[c]['parent'] = p # only one parent currently
                    links_r.remove(x)
                    break
            else:
                print "Link wrong in dpi tree: "+str(x)
                break
        print tree
        self.response_app.dpi_info['tree'] = tree
        print self.response_app.dpi_info['tree']

        # start dpi monitor

        # print "dpi monitor thread: start"
        # self.dpi_thread = hub.spawn(self.response_app._dpi_monitor)

        # add dpi to query queue
        # XXX: handle Full exception
        self.response_app.dpiq.put(self.response_app.dpi_info)

        return "DPI_INIT_OK"
