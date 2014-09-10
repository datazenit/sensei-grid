// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid dom events", function () {

    var grid;
    var $el = $('<div class="sensei-grid">');

    // create dom element before each test
    beforeEach(function () {

        // suppress console.log statements from src files
        console.log = function () {};

        // create wrapper element
        $("body").append($el);

        // render grid
        grid = $el.grid(data, columns);
        grid.registerEditor(BasicEditor);
        grid.render();

    });

    // remove grid wrapper after each test
    afterEach(function () {
        grid.destroy();
        grid = null;
    });

    describe("click", function () {
        it("should set active cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("click");
            expect($cell.hasClass("activeCell")).toBe(true);

            var $cell2 = $(".sensei-grid>table>tbody>tr:eq(4)>td:eq(1)");
            $cell2.trigger("click");
            expect($cell2.hasClass("activeCell")).toBe(true);
        });
        it("should only activate one cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("click");
            expect($(".sensei-grid .activeCell").length).toBe(1);

            var $cell2 = $(".sensei-grid>table>tbody>tr:eq(4)>td:eq(1)");
            $cell2.trigger("click");
            expect($(".sensei-grid .activeCell").length).toBe(1);
        });
        it("outside of grid should remove active cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("click");

            expect($(".sensei-grid .activeCell").length).toBe(1);

            $(document).trigger("click");
            expect($(".sensei-grid .activeCell").length).toBe(0);
        });
        it("outside of grid should close editor", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("dblclick");
            expect($(".sensei-grid-editor").is(":visible")).toBe(true);
            expect($(".sensei-grid-editor").length).toBe(1);

            $(document).trigger("click");
            expect($(".sensei-grid .activeCell").length).toBe(0);
            expect($(".sensei-grid-editor").is(":visible")).toBe(false);
        });
    });
    describe("dblclick", function () {
        it("should open editor", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("dblclick");
            expect($(".sensei-grid-editor").is(":visible")).toBe(true);
            expect($(".sensei-grid-editor").length).toBe(1);
        });
    });
    describe("keypress", function () {
        it("right arrow should move active cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(0)");
            $cell.trigger("click");
            expect($cell.hasClass("activeCell")).toBe(true);

            var e = $.Event("keydown");
            e.which = 39; // right

            // start position

            $(".sensei-grid>table").trigger(e);
            expect($cell.hasClass("activeCell")).toBe(false);
            expect($cell.next().hasClass("activeCell")).toBe(true);

            // end position

            $cell = $(".sensei-grid>table>tbody>tr:eq(9)>td:eq(4)");
            $cell.trigger("click");
            $(".sensei-grid>table").trigger(e);
            expect($cell.hasClass("activeCell")).toBe(true);
        });
        it("left arrow should move active cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(4)");
            $cell.trigger("click");
            expect($cell.hasClass("activeCell")).toBe(true);

            var e = $.Event("keydown");
            e.which = 37; // left

            // end position

            $(".sensei-grid>table").trigger(e);
            $cell = $(".sensei-grid>table>tbody>tr:eq(0)>td:eq(3)");
            expect($cell.hasClass("activeCell")).toBe(true);

            // start position

            $cell = $(".sensei-grid>table>tbody>tr:eq(0)>td:eq(0)");
            $cell.trigger("click");
            $(".sensei-grid>table").trigger(e);
            expect($cell.hasClass("activeCell")).toBe(true);
        });
        it("up arrow should move active cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:eq(0)>td:eq(0)");
            $cell.trigger("click");
            expect($cell.hasClass("activeCell")).toBe(true);

            var e = $.Event("keydown");
            e.which = 38; // up

            // movement at start position

            $(".sensei-grid>table").trigger(e);
            $cell = $(".sensei-grid>table>tbody>tr:eq(0)>td:eq(0)");
            expect($cell.hasClass("activeCell")).toBe(true);

            // movement at end position

            $cell = $(".sensei-grid>table>tbody>tr:eq(1)>td:eq(0)");
            $cell.trigger("click");
            $(".sensei-grid>table").trigger(e);
            $cell = $(".sensei-grid>table>tbody>tr:eq(0)>td:eq(0)");
            expect($cell.hasClass("activeCell")).toBe(true);
        });
        it("down arrow should move active cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(0)");
            $cell.trigger("click");
            expect($cell.hasClass("activeCell")).toBe(true);

            var e = $.Event("keydown");
            e.which = 40; // down

            // movement at start position

            $(".sensei-grid>table").trigger(e);
            $cell = $(".sensei-grid>table>tbody>tr:eq(1)>td:eq(0)");
            expect($cell.hasClass("activeCell")).toBe(true);

            // movement at end position

            $cell = $(".sensei-grid>table>tbody>tr:eq(9)>td:eq(0)");
            $cell.trigger("click");
            $(".sensei-grid>table").trigger(e);
            expect($cell.hasClass("activeCell")).toBe(true);
        });
    });
});