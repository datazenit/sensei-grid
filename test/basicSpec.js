var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid", function () {

    var grid;

    // create dom element before each test
    beforeEach(function () {
        var $el = $('<div class="sensei-grid-test">');
        $("body").append($el);
        grid = $el.grid(data, columns);
        grid.render();
    });

    // remove grid wrapper after each test
    afterEach(function () {
        $(".sensei-grid-test").remove();
        grid = null;
    });

    it("should have a wrapper element", function () {
        expect($(".sensei-grid-test").length).toBe(1);
    });

    it("should have a table element and core structure", function () {
        expect($(".sensei-grid-test>table").length).toBe(1);
        expect($(".sensei-grid-test>table>thead").length).toBe(1);
        expect($(".sensei-grid-test>table>tbody").length).toBe(1);
        expect($(".sensei-grid-test>table>tbody>tr").length).toBe(10);
        expect($(".sensei-grid-test>table>thead>tr").length).toBe(1);
    });
});