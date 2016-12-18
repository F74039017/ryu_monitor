$(function() {
<<<<<<< HEAD
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
=======
    $('#icon-info').click(function() {
        $('#tab-info').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
    });

    $('#info-back').click(function() {
        $('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible').addClass('hidden');
    });

    $('#icon-topo').click(function() {
        $('#tab-topo').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
    });

    $('#topo-back').click(function() {
        $('#tab-topo').animate({ "right": "-1000px" }, 500).removeClass('visible').addClass('hidden');
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    });
});
