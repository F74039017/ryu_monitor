/*
dpi_oper object is a DPI parser and accessor originally.
For convenience, this object also parses switch port data, including bytes and packets counter of switch's port.
The port data is collected with OpenFlow 1.3 protocol by Ryu App. And DPI data is analyzed by ndpi.
DPI and Port data are processed by two independent events.

Usage:
    new dpi_oper(dpid): 
        new object and init dpid, tree, sw_host_table

    updateDPI(data): 
        update DPI data and callback

    updatePort(data):
        update Port data and callback

    regCallBack(type, cb_name, id, cb_func, ref=null) {
        register callback, and it will be invoked after data updated.
        if id can not be found, callback will be removed automatically.
        callback is invoked with one argument, dpi_data or port_data.
            type: 'dpi' or 'port'
            cb_name: callback name. This is the id for callback
            id: ipv4 or dpid. It will return corresponding data in callback
            cb_func: invoked with one argument. e.g function(dpi_data){}
            ref: thisArg. allow user use this variable to reference to the object

    removeCallback(type, callback_name):
        remove callback from callback_buffer

Notice:
    This operator is only for tree structure network currently.
*/

function dpi_oper(dpid=null, period=null) {
    /* variables */
    this.dpid; // root dpid, which is the switch connecting to the dpi server
    this.period;
    this.dpi_info;
    this.sw_host_table;
    this.tree;
    this.host_data;
    this.dpi_callbacks;
    this.port_callbacks;
    this.ready; // 1:dpid, 2:tree, 4:sw_host_table

    /* constructor */
    this.dpi_info = null;
    this.dpi_port = null;
    this.sw_host_table = null; // {dpid: port_no: {host_ipv4}, dpid2: {...}}
        // tree = {rdpid: {'parent': None, 'child': [], 'dpi_data': {protocol_name: {bytes, packets}}, 'port_data': port_no: {rx_pkt, rx_byte, tx_pkt, tx_byte}} }
    this.tree = null; // contain parent and child info. update this with updateTree() method  
    this.host_data = {}; // dpi_info => host_data by ip {hostname: {'dpi_data': {protocol_name: {bytes, packets}}, 'port_data': {...}}}
    this.dpi_callbacks = []; // [[name, id, function(dpi_data), ref], ..]
    this.port_callbacks = []; // [[name, id, function(port_data), ref], ..]
    this.ready = 0;

    this.updateHost();
    this.updateTree();
    this.setRootDpid(dpid);
    this.setPeriod(period);

    // DEBUG - CONTRUCT
    console.log("dpi_oper is constrcuted");
    console.log(this.dpid);
}

/**********************************
 *  update basic data
 **********************************/

/* update dpi_info */
dpi_oper.prototype.updateDPI = function(data) {
    this.dpi_info = data;
    if(this.isReady()) {
        this.collectDPI();
    }
}

/* update port_info */
dpi_oper.prototype.updatePort = function(data) {
    if(this.isReady()) {
        this.updatePortTable(data);
    }
}

/* set root dpid */
dpi_oper.prototype.setRootDpid = function(dpid) {
    if(dpid) {
        this.dpid = dpid;
        this.ready |= 1;
    }
}

/* set period */
dpi_oper.prototype.setPeriod = function(period) {
    this.period = period;
}

/* 
 * update sw_host_table 
 * Notice: Asynchronously
 * */
dpi_oper.prototype.updateHost = function(callback=null) {
    _this = this;
    this.sw_host_table = {};
    d3.json("/v1.0/topology/hosts", function(error, hosts) {
        //console.log(hosts);
        hosts.forEach(function(host) {
            var h = host.ipv4[0];
            var s = trimInt(host.port.dpid);
            var p = trimInt(host.port.port_no);
            if (typeof _this.sw_host_table[s] == "undefined") {
                _this.sw_host_table[s] = {};
            }
            _this.sw_host_table[s][p] = h;
        });
        // DEBUG - CHECK HOST TABLE
        // console.log("dump sw_host_table");
        // console.log(_this.sw_host_table);
        
        _this.ready |= 4;
        if(callback) {
            callback.call(_this);
        }
    });
}


/*
 *  update dpi tree struct 
 *  Notice: Asynchronously
 *  */
dpi_oper.prototype.updateTree = function(callback=null) {
    _this = this;
    d3.json("/dpi_tree", function(error, tree) {
        // console.log("init tree");
        // console.log(tree);
        _this.tree = tree;

        _this.ready |= 2;
        if(callback) {
            callback.call(_this);
        }
    });
}

/**********************************
 *  Callback function
 **********************************/

/*
 * type => 'dpi' or port 
 * return index of callback function.
 * if not exist, return -1 
 * */
dpi_oper.prototype.cb_indexOf = function(type, cb_name) {
    var callbacks;
    if(type=='dpi') {
        callbacks = this.dpi_callbacks;
    }
    else if(type=='port') {
        callbacks = this.port_callbacks;
    }
    else {
        throw "unknown type";
    }

    for(var x in callbacks) {
        if(callbacks[x][0]==cb_name) {
            return x;
        }
    }
    return -1;
}

/* 
 * Register callback function 
 * All callback functions will be called after collectDPI()
 * param:
 *   type => 'dpi' or 'port'
 *   ref => this will point to ref object in cn_func
 *   id => ipv4 or dpid. callback will return corresponding data
 *   cb_name => callback name
 *   cb_func => callback function
 * */
dpi_oper.prototype.regCallBack = function(type, cb_name, id, cb_func, ref=null) {
    if(type=='dpi') {
        if(this.cb_indexOf(type, cb_name)!=-1) {
            console.log(cb_name+" callback existed already");
            return;
        }
        this.dpi_callbacks.push([cb_name, id, cb_func, ref]);
    }
    else if(type=='port') {
        if(this.cb_indexOf(type, cb_name)!=-1) {
            console.log(cb_name+" callback existed already");
            return;
        }
        this.port_callbacks.push([cb_name, id, cb_func, ref]);
    }
    else {
        throw "unknown type";
    }
}

/* remove callback event from buffer */
dpi_oper.prototype.removeCallback = function(type, cb_name) {
    /* check existence */
    var index = this.cb_indexOf(type, cb_name);

    if(index==-1) {
        //console.log(cb_name+" callback not exist"); 
        throw cb_name+" callback not exist";
    }


    /* remove */
    if(type=='dpi') {
        this.dpi_callbacks.splice(index, 1);
    }
    else if(type=='port') {
        this.port_callbacks.splice(index, 1);
    }
}


/**********************************
 *  Helper function
 **********************************/

dpi_oper.prototype.isReady = function() {
    if((this.ready&7)==7) {
        return true;
    }
    return false;
}

dpi_oper.prototype.resetHostDPI = function() {
    if(this.host_data) {
        for(var x in this.host_data) {
            this.host_data[x]['dpi_data'] = {};
        }
    }
}

dpi_oper.prototype.resetTreeDPI = function() {
    if(this.tree) {
        for(var x in this.tree) { // x is dpid
            this.tree[x]['dpi_data'] = {};
        }
    }
    else {
        console.log("error: tree struct is null");
    }
}

dpi_oper.prototype.resetHostPort = function() {
    if(this.host_data) {
        for(var x in this.host_data) {
            this.host_data[x]['port_data'] = {};
        }
    }
}

dpi_oper.prototype.resetTreePort = function() {
    if(this.tree) {
        for(var x in this.tree) { // x is dpid
            this.tree[x]['port_data'] = {};
        }
    }
    else {
        console.log("error: tree struct is null");
    }
}

dpi_oper.prototype.resetDPI = function() {
    this.resetHostDPI();
    this.resetTreeDPI();
}

dpi_oper.prototype.resetPort = function() {
    this.resetHostPort();
    this.resetTreePort();
}

dpi_oper.prototype.checkIPv4 = function(str) {
    if (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(str)) {
        return true;
    } else {
        return false;
    }
}

/* 
 * protocol entry
 * {
 *      protoName: string,
 *      bytes: int,
 *      packets: int
 * }
 * */
dpi_oper.prototype.toEntry = function(protoName, bytes, packets) {
    return {protoName: protoName, bytes: bytes, packets: packets};
}

dpi_oper.prototype.dpiInfo2HostData = function() {
    if(!this.dpi_info) {
        console.log("No dpi_info");
        return;
    }

    /* reset dpi */
    this.resetHostDPI();
    
    for(var x in this.dpi_info['known.flows']) {
        var entry = this.dpi_info['known.flows'][x];

        /* only record flow using ipv4 */
        if(this.checkIPv4(entry['host_a.name']) && this.checkIPv4(entry['host_b.name'])) {
            // create a dict, which contain both src and dst.
            // Though one of src and dst may not under the tree,
            // we won't count it because it won't be found during dfs.
            
            // nested dict {host_name: {protocol_name: {bytes, packets}}}
            var hosta_name = entry['host_a.name'];
            var hostb_name = entry['host_b.name'];
            var protocol = entry['detected.protocol.name'];
            var bytes = entry['bytes'];
            var packets = entry['packets'];
            
            // init host entry
            if(! this.host_data.hasOwnProperty(hosta_name)) {
                this.host_data[hosta_name] = {};
            }
            if(! this.host_data.hasOwnProperty(hostb_name)) {
                this.host_data[hostb_name] = {};
            }

            // init dpi_data entry
            if(! this.host_data[hosta_name].hasOwnProperty('dpi_data')) {
                this.host_data[hosta_name]['dpi_data'] = {};
            }
            if(! this.host_data[hostb_name].hasOwnProperty('dpi_data')) {
                this.host_data[hostb_name]['dpi_data'] = {};
            }

            // init protocol entry
            if(! this.host_data[hosta_name]['dpi_data'].hasOwnProperty(protocol)) {
                this.host_data[hosta_name]['dpi_data'][protocol] = {bytes: 0, packets: 0};
            }
            if(! this.host_data[hostb_name]['dpi_data'].hasOwnProperty(protocol)) {
                this.host_data[hostb_name]['dpi_data'][protocol] = {bytes: 0, packets: 0};
            }

            this.host_data[hosta_name]['dpi_data'][protocol]['bytes'] += parseInt(bytes);
            this.host_data[hosta_name]['dpi_data'][protocol]['packets'] += parseInt(packets);
            this.host_data[hostb_name]['dpi_data'][protocol]['bytes'] += parseInt(bytes);
            this.host_data[hostb_name]['dpi_data'][protocol]['packets'] += parseInt(packets);
        }

         //console.log(this.host_data);
    }
}

/**********************************
 *  API - detected protocol
 **********************************/

/* get protocol information with protoName. If the protoName not found, then return null.
 * Type: include "bytes", "packets", "entry"
 * */
dpi_oper.prototype.getDetectProto = function(protoName, type='entry') {
    for(var x in this.dpi_info["detected.protos"]) {
        if ( this.dpi_info["detected.protos"][x]['name'] == protoName ) {
            if ( type == "bytes" ) {
                return this.dpi_info["detected.protos"][x]['bytes'];
            }
            else if ( type == "packets"  ) {
                return this.dpi_info["detected.protos"][x]['packets'];
            }
            else if ( type == "entry" ) {
                return this.toEntry(protoName, this.dpi_info["detected.protos"][x]['bytes'], this.dpi_info["detected.protos"][x]['packets']);
            }
            else {
                console.log("unknown type");
            }
        }
    }
    return null;
}

/* return a list containing all detected protocol entries */
dpi_oper.prototype.getDetectProtoList = function() {
    var ret = [];
    for(var x in this.dpi_info["detected.protos"]) {
        ret.push(this.toEntry(this.dpi_info["detected.protos"][x]['name'], this.dpi_info["detected.protos"][x]['bytes'], this.dpi_info["detected.protos"][x]['packets']));
    }
    return ret;
}

dpi_oper.prototype.getSwHostTable = function() {
    return this.sw_host_table;
}

/**********************************
 *  API - sw and host
 **********************************/

/**************************     DPI Info.     *********************************/

/* DFS tree and collect DPI data */
dpi_oper.prototype.collectDPI = function() {

    /* Secure Checking */
    if(this.dpid == null) {
        console.log("Fatal: No dpid property. Stop collect DPI");
        return -1;
    }
    if(this.tree == null) {
        console.log("Tree is null... Try to update");
        this.updateTree(function(){
            if(this.tree==null) {
                console.log("Fatal: Can't update tree. Stop collect DPI");
            }
        });
        return -1;
    }
    if(this.sw_host_table == null) {
        console.log("sw_host_table is null... Try to update");
        this.updateHost(function(){
            if(this.sw_host_table==null) {
                console.log("Fatal: Can't update sw_host_table. Stop collect DPI");
            }
        });
        return -1;
    }

    this.dpiInfo2HostData();
    this.resetTreeDPI();

    //console.log(this.host_data);
    dfs.call(this, this.dpid);
    //console.log(this.tree);

    /* call all callback functions */
    for(var x in this.dpi_callbacks) {
        // callback => 0:name, 1:id, 2:func, 3:thisArg
        var callback = this.dpi_callbacks[x];
        try {
            var data = this.getDPIById(callback[1]);
            if(data==null) throw "unknown id";
            callback[2].call(callback[3], data); // callback is invoked with one argument, dpi_data.
        }
        catch (err) {
            console.log("Exception callback - "+callback[0]+": "+err.stack);
            console.log("Remove callback - "+callback[0]);
            this.removeCallback('dpi', callback[0]);
        }
    }

    function dfs(dpid) {
        // dfs search
        //console.log(dpid);
        var child_list = this.tree[dpid]['child'];
        //console.log(child_list);
        for(var x in child_list) {
            dfs.call(this, child_list[x]);  // expand => dpi info will collect to child sw

            /* pull child sw info. up */
            if(this.tree[child_list[x]].hasOwnProperty("dpi_data")) {
                var child_dpiData = this.tree[child_list[x]]["dpi_data"];
                for(var protoName in child_dpiData) {
                    var entry = child_dpiData[protoName];
                    addProtoData.call(this, dpid, protoName, entry['bytes'], entry['packets']); // add child entry to parent
                }
            }
        }


        /* sw collect all collecting hosts */
        //console.log(this.host_data);
        for(var x in this.sw_host_table[dpid]) {
            var hostName = this.sw_host_table[dpid][x];
            //console.log("check "+hostName);
            // look up table to check whether there are some data for the connecting host
            if(this.host_data.hasOwnProperty(hostName)) {
                var protocol_list = this.host_data[hostName]['dpi_data'];
                // add all dpi data of the host
                for(var protoName in protocol_list) {
                    //console.log(hostName+" "+protoName);
                    addProtoData.call(this, dpid, protoName, protocol_list[protoName]['bytes'], protocol_list[protoName]['packets']); 
                }
            }
        }

        /* add dpi data to some dpid (sw) */
        function addProtoData(dpid, protoName, bytes, packets) {
            if(!this.tree[dpid]['dpi_data'].hasOwnProperty(protoName)) {
                this.tree[dpid]['dpi_data'][protoName] = {bytes: bytes, packets: packets};
            }
            else {
                this.tree[dpid]['dpi_data'][protoName]['bytes'] += bytes;
                this.tree[dpid]['dpi_data'][protoName]['packets'] += packets;
            }
        }
    }
}

/* 
 * host_data => {host_name: 'dpi_data': protoName: {bytes, packets}}
 * */
dpi_oper.prototype.hostExistProto = function(hostName, protoName) {
    if(this.hasOwnProperty('host_data')) {
        if(this.host_data.hasOwnProperty(hostName)) {
            if(this.host_data[hostName]['dpi_data'].hasOwnProperty(protoName)) {
                return true;
            }
        }
    }

    return false;
}

/*
 * tree['dpi_data'] => {dpid: protoName: {bytes, packets}}
 * */
dpi_oper.prototype.swExistProto = function(dpid, protoName) {
    if(this.hasOwnProperty('tree')) {
        if(this.tree.hasOwnProperty(dpid)) {
            if(this.tree[dpid].hasOwnProperty('dpi_data')) {
                if(this.tree[dpid]['dpi_data'].hasOwnProperty(protoName)) {
                    return true;
                }
            }
        }
    }
    return false;
}

/* 
 * protocol entry
 * {
 *      protoName: string,
 *      bytes: int,
 *      packets: int
 * }
 * */

/* return entry of the host protocol */
dpi_oper.prototype.getHostProto = function(hostName, protoName) {
    if(this.hostExistProto(hostName, protoName)) {
        var target = this.host_data[hostName]['dpi_data'][protoName];
        return this.toEntry(protoName, target['bytes'], target['packets']);
    }
}

/* return entry of the sw protocol */
dpi_oper.prototype.getSwProto = function(dpid, protoName) {
    if(this.swExistProto(dpid, protoName)) {
        var target = this.tree[dpid]['dpi_data'][protoName];
        return this.toEntry(protoName, target['bytes'], target['packets']);
    }
}

/* return a list entries of host protocols */
dpi_oper.prototype.getHostProtoList = function(hostName) {
    if(this.hasOwnProperty('host_data')) {
        if(this.host_data.hasOwnProperty(hostName)) {
            if(this.host_data[hostName].hasOwnProperty('dpi_data')) {
                var ret = [];
                var list = this.host_data[hostName]['dpi_data'];
                for(var x in list) {
                    var name = x;
                    ret.push(this.toEntry(name, list[name]['bytes'], list[name]['packets']));
                }
                return ret;
            }
        }   
    }
    return null;
}

/* return a list entries of sw protocols */
dpi_oper.prototype.getSwProtoList = function(dpid) {
    if(this.hasOwnProperty('tree')) {
        if(this.tree.hasOwnProperty(dpid)) {
            if(this.tree[dpid].hasOwnProperty('dpi_data')) {
                if(this.tree[dpid].hasOwnProperty('dpi_data')) {
                    var ret = [];
                    var list = this.tree[dpid]['dpi_data'];
                    for(var x in list) {
                        var name = x;
                        ret.push(this.toEntry(name, list[name]['bytes'], list[name]['packets']));
                    }
                    return ret;
                }
            }
        }
    }
    return null;
}

/*
 * id => ipv4 or dpid / support ids []
 * return dpi_data entry {protoName: {bytes: int, packets: int}}
 * */
dpi_oper.prototype.getDPIById = function(id) {

    if(Object.prototype.toString.call(id) === '[object Array]') {
        var arr = id;
        var ret = {};
        for(var x in arr) {
            var _id = arr[x];
            var isHost = this.checkIPv4(_id);

            if(isHost) {
                ret[_id] = this.getHostProtoList(_id);
            }
            else {
                ret[_id] = this.getSwProtoList(_id);
            }
        }
        return ret;
    }
    else {
        var isHost = this.checkIPv4(id);
        if(isHost) {
            return this.getHostProtoList(id);
        }
        else {
            return this.getSwProtoList(id);
        }
    }
}


/**************************     Port Info.     *********************************/

/* 
 * Convert dpid and port_no to host ipv4 address 
 * If not exist, return null
 * */
dpi_oper.prototype.dp2host = function(dpid, port_no) {
    if(this.sw_host_table[dpid].hasOwnProperty(port_no)) {
        return this.sw_host_table[dpid][port_no];
    }
    return null;
}


/*
 * tree = {dpid: 'port_data': {port_no: {rx_pkt, rx_byte, tx_pkt, tx_byte}, 'tot_pkt': int, 'tot_byte': int}}
 * */
dpi_oper.prototype.updatePortTable = function(data) {
    var dpid = data['dpid'];
    var port_info = data['port_info'];

    if(this.tree == null) {
        console.log("Tree is null... Try to update");
        this.updateTree(function(){
            if(this.tree==null) {
                console.log("Fatal: Can't update tree. Stop update port table");
            }
        });
        return -1;
    }

    /* reset sw port data */
    this.tree[dpid]['port_data'] = {};

    var tot_pkt=0, tot_byte=0;
    var effected_host = [];
    for(var x in port_info) {

        /* collect tree (sw) info. */
        var entry = port_info[x];
        var port_no = entry['port_no'];
        var rx_pkt = entry['rx_pkt'];
        var rx_byte = entry['rx_byte'];
        var tx_pkt = entry['tx_pkt'];
        var tx_byte = entry['tx_byte'];

        this.tree[dpid]['port_data'][port_no] = {rx_pkt: rx_pkt, rx_byte: rx_byte, 
                                            tx_pkt: tx_pkt, tx_byte: tx_byte};
        
        // tot_xxx => sum of ports' recv data
        tot_pkt += rx_pkt;
        tot_byte += rx_byte;

        /* host data */
        var hostName = this.dp2host(dpid, port_no);
        if(hostName) {
            effected_host.push(hostName);
            if(!this.host_data.hasOwnProperty(hostName)) {
                this.host_data[hostName] = {};
            }

            this.host_data[hostName]['port_data'] = {rx_pkt: rx_pkt, rx_byte: rx_byte, 
                                                tx_pkt: tx_pkt, tx_byte: tx_byte,
                                                tot_pkt: rx_pkt+tx_pkt, tot_byte: rx_byte+tx_byte};
        }
    }

    /* tree (sw) total data */
    this.tree[dpid]['port_data']['tot_pkt'] = tot_pkt;
    this.tree[dpid]['port_data']['tot_byte'] = tot_byte;

    /* call all callback functions */
    for(var x in this.port_callbacks) {
        // callback => 0:name, 1:id, 2:func, 3:thisArg
        var callback = this.port_callbacks[x];
        var id = callback[1];

        // only invoke the callback of effected switch of hosts
        if(id==dpid || effected_host.indexOf(id)!=-1) {
            try {
                var data = this.getPortById(id);
                if(data==null) throw "unknown id";
                callback[2].call(callback[3], data); // callback is invoked with one argument, dpi_data.
            }
            catch (err) {
                console.log("Exception callback - "+callback[0]+": "+err);
                console.log("Remove callback - "+callback[0]);
                this.removeCallback('port', callback[0]);
            }
        }
    }
}

/* 
 * XXX: shallow copy of object.
 * Do not change the value in the return object
 * id => 'dpi' or 'ipv4'
 * */
dpi_oper.prototype.getHostPort = function(hostName) {
    if(this.hasOwnProperty('host_data')) {
        if(this.host_data.hasOwnProperty(hostName)) {
            if(this.host_data[hostName].hasOwnProperty('port_data')) {
                return {1: this.host_data[hostName]['port_data']}; // host only one port
            }
        }   
    }
    return null;
}

dpi_oper.prototype.getSwPort = function(dpid) {
    if(this.hasOwnProperty('tree')) {
        if(this.tree.hasOwnProperty(dpid)) {
            if(this.tree[dpid].hasOwnProperty('port_data')) {
                if(this.tree[dpid].hasOwnProperty('port_data')) {
                    return this.tree[dpid]['port_data'];
                }
            }
        }
    }
    return null;
}

/*
 * id => ipv4 or dpid / support ids []
 * return dpi_data entry {protoName: {bytes: int, packets: int}}
 * */
dpi_oper.prototype.getPortById = function(id) {
    if(Object.prototype.toString.call(id) === '[object Array]') {
        var arr = id;
        var ret = {};
        for(var x in arr) {
            var _id = arr[x];
            var isHost = this.checkIPv4(_id);

            if(isHost) {
                ret[_id] = this.getHostPort(_id);
            }
            else {
                ret[_id] = this.getSwPort(_id);
            }
        }
        return ret;
    }
    else {
        var isHost = this.checkIPv4(id);
        if(isHost) {
            return this.getHostPort(id);
        }
        else {
            return this.getSwPort(id);
        }
    }

}

