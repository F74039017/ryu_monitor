/*
dpi_oper object is a ndpi parser and accessor.
For convenience, this object will also process switch port data, including bytes and packets counter of switch's port.
The port data is collected with OpenFlow 1.3 protocol by Ryu App.
DPI and Port data are processed with two independent event.

Usage:
    new dpi_oper(dpid): 
        new object and init dpid, tree, sw_host_table

    updateDPI(data): 
        update ndpi data. Call collectDPI() automatically.

    collectDPI(): 
        parse DPI data. save dpi data to dpi.tree and dpi.host_data.
        invoke all callbacks in callback_buffer

    regCallBack(callback_name, callback_function, oper_obj):
        register callback, and it will be invoked after dpi data is updated.

    removeCallback(callback_name):
        remove callback from callback_buffer

Notice:
    This operator is only for tree structure network currently.
*/

function dpi_oper(dpid) {
    /* variables */
    this.dpid; // root dpid, which is the switch connecting to the dpi server
    this.dpi_info;
    this.port_info;
    this.sw_host_table;
    this.tree;
    this.host_data;
    this.callback_buffer;

    /* constructor */
    this.dpid = dpid;
    this.dpi_info = null;
    this.dpi_port = null;
    this.sw_host_table = null; // {dpid: port_no: {host_ipv4}, dpid2: {...}}
        // tree = {rdpid: {'parent': None, 'child': [], 'dpi_data': {protocol_name: {bytes, packets}}, 'port_data': {rx_pkt, rx_byte, tx_pkt, tx_byte}} }
    this.tree = null; // contain parent and child info. update this with updateTree() method  
    this.host_data = null; // dpi_info => host_data by ip {hostname: {'dpi_data': {protocol_name: {bytes, packets}}, 'port_data': {...}}}
    this.callback_buffer = []; // [[name, function], ..]

    this.updateHost();
    this.updateTree();

    // DEBUG - CONTRUCT
    console.log("dpi_oper is constrcuted");
    console.log(this.dpid);
}

/**********************************
 *  Setters
 **********************************/

/* update dpi_info */
dpi_oper.prototype.updateDPI = function(data) {
    this.dpi_info = data;
    this.collectDPI();
}

/* update port_info */
dpi_oper.prototype.updatePort = function(data) {
    this.port_info = data;
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
        //console.log("init tree");
        //console.log(tree);
        _this.tree = tree;
        if(callback) {
            callback.call(_this);
        }
    });
}

/**********************************
 *  Callback function
 **********************************/

/*
 * return index of callback function.
 * if not exist, return -1 
 * */
dpi_oper.prototype.cb_indexOf = function(cb_name) {
    for(var x in this.callback_buffer) {
        if(this.callback_buffer[x][0]==cb_name) {
            return x;
        }
    }
    return -1;
}

/* 
 * Register callback function 
 * All callback functions will be called after collectDPI()
 * param:
 *   ref => this will point to ref object in cn_func
 *   cb_name => callback name
 *   cb_func => callback function
 * */
dpi_oper.prototype.regCallBack = function(cb_name, cb_func, ref=null) {
    /* check existence */
    if(this.cb_indexOf(cb_name)!=-1) {
        console.log("Registered callback name already existed..");
        return;
    }
    /* register */
    this.callback_buffer.push([cb_name, cb_func, ref]);
}

/* remove callback event from buffer */
dpi_oper.prototype.removeCallback = function(cb_name) {
    /* check existence */
    var index = this.cb_indexOf(cb_name)
    if(index==-1) {
        console.log(cb_name+" callback not exist");
        return;
    }

    /* remove */
    this.callback_buffer.splice(index, 1);
}


/**********************************
 *  Helper function
 **********************************/

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

dpi_oper.prototype.info2hostData = function() {
    if(!this.dpi_info) {
        console.log("No dpi_info");
        return;
    }

    this.host_data = {}; // reset data
    
    for(var x in this.dpi_info['known.flows']) {
        var entry = this.dpi_info['known.flows'][x];

        /* only record flow using ipv4 */
        if(checkIPv4(entry['host_a.name']) && checkIPv4(entry['host_b.name'])) {
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

            // init dpi_data tag
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

    function checkIPv4(str) {
        if(str.indexOf(":")==-1)
            return true;
        else
            return false;
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

    this.info2hostData();

    //console.log(this.host_data);
    dfs.call(this, this.dpid);
    //console.log(this.tree);

    /* call all callback functions */
    for(var x in this.callback_buffer) {
        var callback = this.callback_buffer[x];
        try {
            callback[1].call(callback[2]);
        }
        catch (err) {
            console.log("Exception callback - "+callback[0]+": "+err);
            console.log("Remove callback - "+callback[0]);
            this.removeCallback(callback[0]);
        }
    }

    function dfs(dpid) {
        // clear last record
        this.tree[dpid]['dpi_data'] = {};

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
            var ret = [];
            var list = this.host_data[hostName]['dpi_data'];
            for(var x in list) {
                var name = x;
                ret.push(this.toEntry(name, list[name]['bytes'], list[name]['packets']));
            }
            return ret;
        }   
    }
    return null;
}

/* return a list entries of sw protocols */
dpi_oper.prototype.getSwProtoList = function(dpid) {
    if(this.hasOwnProperty('tree')) {
        if(this.tree.hasOwnProperty(dpid)) {
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
    return null;
}
