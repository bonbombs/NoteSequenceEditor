var Measures = 10;
var InspectedNote = undefined;

$(document).ready(function () {
    $("#MeasureCount").val(Measures);
    for (var i = 0; i < Measures; i++) {
        var MeasureBar = $("<li/>").addClass('ui-droppable');
        var Measure = $("<div/>").addClass('measure');
        Measure.appendTo(MeasureBar);
        MeasureBar.appendTo("#HighwayMeasure");
        //MeasureBar.css("top", (i * 20 * 4) + "px");
    }

    $(".NoteSpawn").on("click", function(e) {
        var NoteType = $(this).attr("id");
        var Note = $("<div/>").addClass("draggable NoteObject " + NoteType)
        Note.data("type", NoteType);
        var NoteDragConfig;
        if (NoteType == "Action") {
            NoteDragConfig = {
                containment: "#NoteHighway",
                scroll: true,
                scrollSensitivity: 100,
                create: function(){$(this).data('position',$(this).position())},
                start:function(){$(this).stop(true,true); Inspect(this)},
                stop:function(){
                    $(this).css('z-index', 0);
                }
            }
        }
        else {
            NoteDragConfig = {
                containment: "#NoteHighway",
                scroll: true,
                scrollSensitivity: 100, 
                grid: [1, 10],
                create: function(){$(this).data('position',$(this).position())},
                start:function(){
                    $(this).stop(true,true); 
                    Inspect(this)
                },
                stop:function(){
                    $(this).css('z-index', 0);
                }
            }
        }
        Note.on("click", function() { Inspect(this)} );
        Note.draggable(NoteDragConfig);
        Note.droppable({
            accept:function(dropElem) {
                if (dropElem.hasClass("NoteObject")) return false;
                else return true;
            }
        })
        Note.prependTo("#NoteContainer");
        
        snapToMiddle(Note, $("#HighwayBackground").first());
        Note.animate({top: '50%'}, {duration: 600, easing: 'easeOutBack'});
    });
    
    $('#HighwayBackground').find('li').droppable({
        drop:function(event, ui){
            snapToMiddle(ui.draggable,$(this));
        }
    });

    $('#HighwayMeasure').find('li').droppable({
        drop:function(event, ui){
            snapToMeasure(ui.draggable,$(this));
        }
    });
    
    $("#DeleteInspectedNote").on("click", function() {
        InspectedNote.remove();
        $("#NoteInspector").hide();
    });
    $("#NoteInspector").hide();

    function snapToMiddle(dragger, target){
        var topMove = dragger.data('position').top;
        var leftMove= target.position().left - dragger.data('position').left + (target.outerWidth(true) - dragger.outerWidth(true)) / 2;
        dragger.animate({left:leftMove},{duration:600,easing:'easeOutBack'});
        if (target.hasClass("LeftTrack")) dragger.data("track", "Left");
        if (target.hasClass("LeftCymbalTrack")) dragger.data("track", "Left Cymbal");
        if (target.hasClass("CenterTrack")) dragger.data("track", "Center");
        if (target.hasClass("RightCymbalTrack")) dragger.data("track", "Right Cymbal");
        if (target.hasClass("RightTrack")) dragger.data("track", "Right");
    }

    function snapToMeasure(dragger, target) {
        var topMove = 0;
        if (dragger.hasClass("Action")) {
            topMove = target.position().top - (dragger.outerHeight(true)) / 2;
        }
        if (dragger.hasClass("Fourth")) {
            topMove = target.position().top - dragger.data('position').top + (target.outerHeight(true) - dragger.outerHeight(true)) / 2;
        }
        if (dragger.hasClass("Eighth")) {
            console.log(target);
            if ((dragger.position().top + (dragger.outerHeight(true)/2)) > target.position().top + target.outerHeight(true) / 2) {
                topMove = target.position().top + target.outerHeight(true) - (dragger.outerHeight(true)) + 10;
            }
            else {
                topMove = target.position().top;
            }
        }
        if (dragger.hasClass("Sixteenth")) {
            if ((dragger.position().top + (dragger.outerHeight(true)/2)) > target.position().top + target.outerHeight(true) / 2) {
                //lower
                if ((dragger.position().top + (dragger.outerHeight(true)/2)) >= target.position().top + target.outerHeight(true)) {
                    // lower lower
                    console.log("lower lower")
                    topMove = target.position().top + target.outerHeight(true) - (dragger.outerHeight(true)/2);
                }
                else {
                    // upper lower
                    console.log("lower upper")
                    topMove = target.position().top + (target.outerHeight(true) / 2);
                }
            }
            else {
                //upper
                if ((dragger.position().top + (dragger.outerHeight(true)/2)) < (target.position().top + (target.outerHeight(true)) / 4)) {
                    // upper upper
                    console.log("upper upper")
                    topMove = target.position().top;
                }
                else {
                    // upper lower
                    console.log("upperlower")
                    topMove = target.position().top + (target.outerHeight(true) / 4);
                }
            }
        }
        dragger.animate({top:topMove},{duration:600,easing:'easeOutBack'});
    }

    function Inspect(Note) {
        if (InspectedNote == undefined) {
            InspectedNote = $(Note);
            $(Note).addClass("selectedNote");
            PopulateNoteInspector(Note);
            $("#NoteInspector").show();
        }
        else if (InspectedNote.is(Note)) {
            InspectedNote = undefined;
            $(Note).removeClass("selectedNote");
            $("#NoteInspector").hide();
        }
        else if (InspectedNote != undefined) {
            InspectedNote.removeClass("selectedNote");
            InspectedNote = $(Note);
            $(Note).addClass("selectedNote");
            PopulateNoteInspector(Note);
            $("#NoteInspector").show();
        }
        else {
            InspectedNote = $(Note);
            $(Note).addClass("selectedNote");
            PopulateNoteInspector(Note);
            $("#NoteInspector").show();
        }
    }

    function PopulateNoteInspector(Note) {
        $("#NoteType").val($(Note).data("type"));
        $("#NoteTarget").val($(Note).data("target"));
        
    }

    function readJSON() {

    }

    function writeJSON() {
        $('#NoteContainer').children('.NoteObject').each(function(i) { 
            // get track, get time, get note
        });
    }
});