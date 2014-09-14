// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid new row", function () {

    var grid;
    var $el = $('<div class="sensei-grid">');

    // create dom element before each test
    beforeEach(function () {

        // suppress console.log statements from src files
        console.log = function () {};

        // create wrapper element
        $("body").append($el);
    });

    // remove grid wrapper after each test
    afterEach(function () {
        grid.destroy();
        grid = null;
    });

    it("should render new empty row at the end of table if setting is enabled", function () {
        // render grid
        grid = $el.grid(data, columns, {emptyRow: true});
        grid.render();

        expect($(".sensei-grid>table>tbody>tr").length).toEqual(11);
        expect($(".sensei-grid>table>tbody>tr:last").text()).toEqual("");
        expect($(".sensei-grid>table>tbody>tr.sensei-grid-empty-row").length).toBe(1);
    });

    it("should not render new empty row at the end of table if setting is disabled", function () {
        // render grid
        grid = $el.grid(data, columns, {emptyRow: false});
        grid.render();

        expect($(".sensei-grid>table>tbody>tr").length).toEqual(10);
        expect($(".sensei-grid>table>tbody>tr:last").text()).not.toEqual("");
        expect($(".sensei-grid>table>tbody>tr.sensei-grid-empty-row").length).toBe(0);
    });

    it("should set unsaved row state to the empty row", function () {
        // render grid
        grid = $el.grid(data, columns, {emptyRow: true});
        grid.render();

        var $emptyCell = $(".sensei-grid>table>tbody>tr:last>td:first");

        expect($emptyCell.data("saved")).toEqual(false);
        expect(grid.getCellStatus($emptyCell)).toEqual(false);

        var $cell = $(".sensei-grid>table>tbody>tr:first>td:first");

        expect($cell.data("saved")).toEqual(true);
        expect(grid.getCellStatus($cell)).toEqual(true);
    });

    it("should always assure that there is an empty row", function () {
        // render grid
        grid = $el.grid(data, columns, {emptyRow: true});
        grid.registerEditor(BasicEditor);
        grid.render();

        var $cell = $(".sensei-grid>table>tbody>tr:last>td:first");

        expect($(".sensei-grid>table>tbody>tr.sensei-grid-empty-row").length).toBe(1);
        expect($(".sensei-grid>table>tbody>tr").length).toBe(11);

        $cell.trigger("dblclick");
        $(".sensei-grid-editor input").val("test");
        $cell.next().trigger("click");

        expect($cell.text()).toEqual("test");
        expect($(".sensei-grid>table>tbody>tr:last").hasClass("sensei-grid-empty-row")).toBe(true);
        expect($(".sensei-grid>table>tbody>tr.sensei-grid-empty-row").length).toBe(1);
        expect($(".sensei-grid>table>tbody>tr").length).toBe(12);
    });
});