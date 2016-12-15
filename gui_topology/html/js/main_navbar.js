$(function() {
    $('#icon-info').click(function() {
        $('#tab-info').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
    });

    $('#info-back').click(function() {
        if ($('#tab-info').hasClass("visible")) {
            $('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible').addClass('hidden');
        } else {
            $('#tab-info').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
        }
    });

    $('#icon-topo').click(function() {
        $('#tab-topo').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
    });

    $('#topo-back').click(function() {
        if ($('#tab-topo').hasClass("visible")) {
            $('#tab-topo').animate({ "right": "-1000px" }, 500).removeClass('visible').addClass('hidden');
        } else {
            $('#tab-topo').animate({ "right": "0px" }, 500).removeClass('hidden').addClass('visible');
        }
    });
});
