$(function() {
    $('#icon-map').click(function() {
        $('#tab-map').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#map-back').click(function() {
        $('#tab-map').animate({ "right": "-1000px" }, 500).removeClass('visible');
    });

    $('#icon-info').click(function() {
        $('#tab-info').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#info-back').click(function() {
        $('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible');
    });
});
