$(function() {
    $('#icon-map').click(function() {
        console.log('右側側欄-map slide-out');
        //$('#tab-map').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#btn-map_back').click(function() {
        console.log('右側側欄-map slide-in');
        //$('#tab-map').animate({ "right": "-1000px" }, 500).removeClass('visible');
    });

    $('#icon-info').click(function() {
        console.log('右側側欄-information slide-out');
        //$('#tab-info').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#btn-info_back').click(function() {
        console.log('右側側欄-information slide-in');
        //$('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible');
    });

    /****  outer sidebar  ****/

    $('#btn-map_bp').click(function(e) {
        e.preventDefault();
        //console.log('右側側欄-map byte/pkt');
        console.log("outer sidebar bp btn");
        if(c3w.getBP_FLAG(dpi_lineChart)==1) {
            c3w.changeBP_FLAG(dpi_lineChart, 2);
            c3w.changeBP_FLAG(port_lineChart, 2);
        }
        else {
            c3w.changeBP_FLAG(dpi_lineChart, 1);
            c3w.changeBP_FLAG(port_lineChart, 1);
        }
    });

    $('#btn-map_proto').click(function() {
        console.log("outer receive btn");
        c3w.changeRT_RANK(port_lineChart, 1);
    });

    $('#btn-map_port').click(function() {
        console.log("outer transmit btn");
        c3w.changeRT_RANK(port_lineChart, 2);
    });

    $('#btn-map_top').click(function() {
        console.log("outer top btn");
        var outer_top_input = $("#outer_top_input");
        var val = outer_top_input.val();
        if(val=="") {
            val = 3;
        }
        c3w.changeRT_RANK(window.dpi_lineChart, val);
    })

    $('#btn-map_hislen').click(function() {
        console.log("outer his btn");
        var outer_his_input = $("#outer_his_input");
        var val = outer_his_input.val();
        if(val=="") {
            val = 10;
        }
        c3w.setHistorySize(window.dpi_lineChart, val);
        c3w.setHistorySize(window.port_lineChart, val);
    })

    /****  inner sidebar  ****/

    $('#btn-info_bp').click(function(e) {
        e.preventDefault();
        //console.log('右側側欄-information byte/pkt');
        console.log("inner sidebar bp btn");
        if(c3w.getBP_FLAG(in_lineChart)==1) {
            if(window.nl_stat==1) {
                c3w.changeBP_FLAG(in_lineChart, 2);
                c3w.changeBP_FLAG(in_lineChart2, 2);
            }
            else {
                c3w.changeBP_FLAG(in_lineChart, 2);
                rx_gauge.internal.config.gauge_max = 3000;
                tx_gauge.internal.config.gauge_max = 3000;
                rx_gauge.internal.config.gauge_units = "Packets";
                tx_gauge.internal.config.gauge_units = "Packets";
            }
        }
        else {
            if(window.nl_stat==1) {
                c3w.changeBP_FLAG(in_lineChart, 1);
                c3w.changeBP_FLAG(in_lineChart2, 1);
            }
            else {
                c3w.changeBP_FLAG(in_lineChart, 1);
                rx_gauge.internal.config.gauge_max = 5000;
                tx_gauge.internal.config.gauge_max = 5000;
                rx_gauge.internal.config.gauge_units = "K bits";
                tx_gauge.internal.config.gauge_units = "K bits";
            }
        }
    });

    $('#btn-info_proto').click(function() {
        console.log("inner protocol btn");
        if(window.nl_stat==1) {
            c3w.changeRT_RANK(in_lineChart2, 1);
        }
        else {
            c3w.changeRT_RANK(in_lineChart, 1);
        }
    });

    $('#btn-info_port').click(function() {
        console.log("inner port btn");
        if(window.nl_stat==1) {
            c3w.changeRT_RANK(in_lineChart2, 2);
        }
        else {
            c3w.changeRT_RANK(in_lineChart, 2);
        }
    });

    $('#btn-info_top').click(function() {
        console.log("in top btn");
        var inner_top_input = $("#inner_top_input");
        var val = inner_top_input.val();
        if(val=="") {
            val = 3;
        }
        if(window.nl_stat==1) {
            c3w.changeRT_RANK(window.in_lineChart, val);
        }
    })

    $('#btn-info_hislen').click(function() {
        console.log("inner his btn");
        var inner_his_input = $("#inner_his_input");
        var val = inner_his_input.val();
        if(val=="") {
            val = 10;
        }
        c3w.setHistorySize(window.in_lineChart, val);
        if(window.nl_stat==1) {
            c3w.setHistorySize(window.in_lineChart2, val);
        }
    })

    /****  view button  ****/

    $('#btn-campus').click(function() {
        window.lv_stat = 3;
        //console.log('資訊系館-campus view');
        //$('#btn-campus').addClass('active');
        //$('#btn-topo').removeClass('active');
        //zoomTopo_reset();
        resetInSideChart();
        intro_out();
    });

    $('#btn-topo').click(function() {
        window.lv_stat = 4;
        //console.log('資訊系館-topology view');
        //$('#btn-topo').addClass('active');
        //$('#btn-campus').removeClass('active');
        //zoomTopo();
        resetOutSideChart();
    });

    /****  traceroute  ****/
    var last_path = null;
    $('#btn-route_go').click(function(e) {
        e.preventDefault();
        var src_addr = $('#src_addr').val();
        var dst_addr = $('#dst_addr').val();
        if(src_addr=="" || dst_addr=="") {
            alert("src or dst field is empty");
            return;
        }
        if(!checkIPv4(src_addr) || !checkIPv4(dst_addr)) {
            alert("src or dst is illegal ipv4 format");
            return;
        }
        if(!validateIds(src_addr)) {
            alert("src address can not be found in the network");
            return;
        }

        // XXX: little hack, webpage current directory is /static
        var query_str = "../send_packet/";
        query_str += src_addr+"/";
        query_str += dst_addr;
        $.get(query_str, function(data) {
            console.log(data);
            if(last_path!=null) {
                clearRoute(last_path);
            }

            /* appending src and dst addr */
            data.unshift(src_addr);
            if(validateIds(dst_addr))
                data.push(dst_addr);
            getRoute(data);

            last_path = data.slice();
        }, "json" );

    });

    $('#btn-route_reset').click(function(e) {
        e.preventDefault();
        $('#src_addr').val("");
        $('#dst_addr').val("");
        if(last_path!=null) {
            clearRoute(last_path);
        }
        last_path = null;
    });
});

/*function zoomTopo() {
    $('.map-demo').fadeOut('slow');
    $('.map-demo').removeClass('active');
    $('.topo-demo').fadeIn('slow');
    $('.topo-demo').addClass('active');

    if ($('#tab-info').hasClass('visible')) {
        $('#tab-info').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    if ($('#tab-map').hasClass('visible')) {
        $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    $('#tab-info').animate({ 'right': '0px' }, 500).addClass('visible');
}

function zoomTopo_reset() {
    $('.topo-demo').fadeOut('slow');
    $('.topo-demo').removeClass('active');
    $('.map-demo').fadeIn('slow');
    $('.map-demo').addClass('active');

    if ($('#tab-map').hasClass('visible')) {
        $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    if ($('#tab-info').hasClass('visible')) {
        $('#tab-info').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    $('#tab-map').animate({ 'right': '0px' }, 500).addClass('visible');
}*/
