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
            //rx_gauge.internal.config.gauge_max = 3000;
            //tx_gauge.internal.config.gauge_max = 3000;
            //rx_gauge.internal.config.gauge_units = "Packets";
            //tx_gauge.internal.config.gauge_units = "Packets";
        }
        else {
            c3w.changeBP_FLAG(dpi_lineChart, 1);
            c3w.changeBP_FLAG(port_lineChart, 1);
            //rx_gauge.internal.config.gauge_max = 5000;
            //tx_gauge.internal.config.gauge_max = 5000;
            //rx_gauge.internal.config.gauge_units = "K bits";
            //tx_gauge.internal.config.gauge_units = "K bits";
        }
    });

    $('#btn-map_proto').click(function() {
        //console.log('右側側欄-map 下方的protocol');
        //$('#btn-map_proto').addClass('active');
        //$('#btn-map_port').removeClass('active');
        //---$('.title-left').text('Protocols');
        //---$('.title-right').text('Source of HTTP');
        //---$('.chart-block-left .chart-main').attr('id', 'protos_pie');
        //---$('.chart-block-right .chart-main').attr('id', 'proto_source');
        console.log("outer receive btn");
        c3w.changeRT_RANK(port_lineChart, 1);
    });

    $('#btn-map_port').click(function() {
        //console.log('右側側欄-map 下方的port');
        //$('#btn-map_port').addClass('active');
        //$('#btn-map_proto').removeClass('active');
        //---$('.title-left').text('Receive');
        //---$('.title-right').text('Transmission');
        //---$('.chart-block-left .chart-main').attr('id', 'rx_gauge');
        //---$('.chart-block-right .chart-main').attr('id', 'tx_gauge');
        console.log("outer transmit btn");
        c3w.changeRT_RANK(port_lineChart, 2);
    });

    $('#btn-map_top').click(function() {
        console.log("outer top btn");
        var outer_top_input = $("#outer_top_input");
        var val = outer_top_input.val();
        c3w.changeRT_RANK(window.dpi_lineChart, val);
    })

    $('#btn-map_hislen').click(function() {
        console.log("outer his btn");
        var outer_his_input = $("#outer_his_input");
        var val = outer_his_input.val();
        c3w.setHistorySize(window.dpi_lineChart, val);
        c3w.setHistorySize(window.port_lineChart, val);
    })

    /****  inner sidebar  ****/

    $('#btn-info_bp').click(function(e) {
        e.preventDefault();
        //console.log('右側側欄-information byte/pkt');
        console.log("inner sidebar bp btn");
        if(c3w.getBP_FLAG(in_lineChart)==1) {
            c3w.changeBP_FLAG(in_lineChart, 2);
            rx_gauge.internal.config.gauge_max = 3000;
            tx_gauge.internal.config.gauge_max = 3000;
            rx_gauge.internal.config.gauge_units = "Packets";
            tx_gauge.internal.config.gauge_units = "Packets";
        }
        else {
            c3w.changeBP_FLAG(in_lineChart, 1);
            rx_gauge.internal.config.gauge_max = 5000;
            tx_gauge.internal.config.gauge_max = 5000;
            rx_gauge.internal.config.gauge_units = "K bits";
            tx_gauge.internal.config.gauge_units = "K bits";
        }
    });

    $('#btn-info_proto').click(function() {
        //console.log('右側側欄-information 下方的protocol');
        //$('#btn-info_proto').addClass('active');
        //$('#info-btn-port').removeClass('active');
        //$('.title-left').text('Protocols');
        //$('.title-right').text('Source of HTTP');
        //$('.chart-block-left .chart-main').attr('id', 'protos_pie');
        //$('.chart-block-right .chart-main').attr('id', 'proto_source');
        console.log("inner protocol btn");
        // TODO: chnage to inner proto chart
        //c3w.changeRT_RANK(port_lineChart, 1);
    });

    $('#btn-info_port').click(function() {
        //console.log('右側側欄-information 下方的port');
        //$('#info-btn-port').addClass('active');
        //$('#btn-info_proto').removeClass('active');
        //$('.title-left').text('Receive');
        //$('.title-right').text('Transmission');
        //$('.chart-block-left .chart-main').attr('id', 'rx_gauge');
        //$('.chart-block-right .chart-main').attr('id', 'tx_gauge');
        console.log("inner port btn");
        //c3w.changeRT_RANK(port_lineChart, 2);
    });

    $('#btn-info_top').click(function() {
        console.log("outer top btn");
        if(window.dp_stat==2) {
            var outer_top_input = $("#outer_top_input");
            var val = outer_top_input.val();
            c3w.changeRT_RANK(window.in_lineChart, val);
        }
    })

    $('#btn-info_hislen').click(function() {
        console.log("inner his btn");
        var outer_his_input = $("#outer_his_input");
        var val = outer_his_input.val();
        c3w.setHistorySize(window.in_lineChart, val);
    })

    /****  view button  ****/

    $('#btn-campus').click(function() {
        window.lv_stat = 3;
        //console.log('資訊系館-campus view');
        //$('#btn-campus').addClass('active');
        //$('#btn-topo').removeClass('active');
        //zoomTopo_reset();
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
