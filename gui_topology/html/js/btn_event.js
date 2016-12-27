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

    $('#btn-map_bp').click(function() {
        console.log('右側側欄-map byte/pkt');
    });

    $('#btn-map_proto').click(function() {
        console.log('右側側欄-map 下方的protocol');
        //$('#btn-map_proto').addClass('active');
        //$('#btn-map_port').removeClass('active');
        //---$('.title-left').text('Protocols');
        //---$('.title-right').text('Source of HTTP');
        //---$('.chart-block-left .chart-main').attr('id', 'protos_pie');
        //---$('.chart-block-right .chart-main').attr('id', 'proto_source');
    });

    $('#btn-map_port').click(function() {
        console.log('右側側欄-map 下方的port');
        //$('#btn-map_port').addClass('active');
        //$('#btn-map_proto').removeClass('active');
        //---$('.title-left').text('Receive');
        //---$('.title-right').text('Transmission');
        //---$('.chart-block-left .chart-main').attr('id', 'rx_gauge');
        //---$('.chart-block-right .chart-main').attr('id', 'tx_gauge');
    });

    $('#btn-info_bp').click(function() {
        console.log('右側側欄-information byte/pkt');
    });

    $('#btn-info_proto').click(function() {
        console.log('右側側欄-information 下方的protocol');
        //$('#btn-info_proto').addClass('active');
        //$('#info-btn-port').removeClass('active');
        //$('.title-left').text('Protocols');
        //$('.title-right').text('Source of HTTP');
        //$('.chart-block-left .chart-main').attr('id', 'protos_pie');
        //$('.chart-block-right .chart-main').attr('id', 'proto_source');
    });

    $('#btn-info_port').click(function() {
        console.log('右側側欄-information 下方的port');
        //$('#info-btn-port').addClass('active');
        //$('#btn-info_proto').removeClass('active');
        //$('.title-left').text('Receive');
        //$('.title-right').text('Transmission');
        //$('.chart-block-left .chart-main').attr('id', 'rx_gauge');
        //$('.chart-block-right .chart-main').attr('id', 'tx_gauge');
    });

    $('#btn-campus').click(function() {
        console.log('資訊系館-campus view');
        //$('#btn-campus').addClass('active');
        //$('#btn-topo').removeClass('active');
        //zoomTopo_reset();
    });

    $('#btn-topo').click(function() {
        console.log('資訊系館-topology view');
        //$('#btn-topo').addClass('active');
        //$('#btn-campus').removeClass('active');
        //zoomTopo();
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
