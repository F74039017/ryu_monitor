$(document).ready(function() {
    $('#icon-info').click(function() {
        $('#tab-info').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#info-back').click(function() {
        if ($('#tab-info').hasClass("visible")) {
            $('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible');
        }
    });

    $('#icon-topo').click(function() {
        $('#tab-topo').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#topo-back').click(function() {
        console.log($('#tab-topo').hasClass('visible'));
        if ($('#tab-topo').hasClass("visible")) {
            $('#tab-topo').animate({ "right": "-1000px" }, 500).removeClass('visible');
        }
    });
});
