// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid api", function () {

    var grid;
    var $el = $('<div class="sensei-grid-test">');

    // create dom element before each test
    beforeEach(function () {

        // suppress console.log statements from src files
        console.log = function () {};

        // create wrapper element
        $("body").append($el);

        // render grid
        grid = $el.grid(data, columns);
        grid.render();
    });

    // remove grid wrapper after each test
    afterEach(function () {
        $(".sensei-grid-test").remove();
        grid = null;
    });

    describe("getRowDataByIndex", function () {
        it("should return data by positive index", function () {
            expect(grid.getRowDataByIndex(0)).toEqual(data[0]);
            expect(grid.getRowDataByIndex(1)).toEqual(data[1]);
            expect(grid.getRowDataByIndex(9)).toEqual(data[9]);
        });
        it("should return data by negative index", function () {
            expect(grid.getRowDataByIndex(-1)).toEqual(data[9]);
        });
        it("should throw error when row is not found", function () {
            expect(function () { grid.getRowDataByIndex(100) }).toThrowError("Row does not exist");
            expect(function () { grid.getRowDataByIndex(-100) }).toThrowError("Row does not exist");
            expect(function () { grid.getRowDataByIndex("foo") }).toThrowError("Row does not exist");
        });
    });

    describe("getRowData", function () {
        it("should return row data", function () {
            var $row = $(".sensei-grid-test>table>tbody>tr");
            expect(grid.getRowData($row.eq(0))).toEqual(data[0]);
            expect(grid.getRowData($row.eq(1))).toEqual(data[1]);
            expect(grid.getRowData($row.eq(9))).toEqual(data[9]);
        });
    });

    describe("getRowCells", function () {
        it("should return row cells", function () {
            var $row = $(".sensei-grid-test>table>tbody>tr:first");
            expect(grid.getRowCells($row).length).toEqual(5);
            expect(grid.getRowCells($row).get()).toEqual($row.find(">td").get());
        });
    });

    describe("getCellDataByIndex", function () {
        it("should return cell data by index", function () {
            expect(grid.getCellDataByIndex(0,0)).toEqual(data[0]["id"]);
            expect(grid.getCellDataByIndex(5,4)).toEqual(data[5]["count"]);
        });
        it("should return cell data by negative index", function () {
            expect(grid.getCellDataByIndex(-1,0)).toEqual(data[9]["id"]);
            expect(grid.getCellDataByIndex(0,-1)).toEqual(data[0]["count"]);
        });
    });

    describe("getCellDataByKey", function () {
        it("should return cell data by key", function () {
            expect(grid.getCellDataByKey(0, "created_at")).toEqual(data[0]["created_at"]);
            expect(grid.getCellDataByKey(1, "title")).toEqual(data[1]["title"]);
            expect(grid.getCellDataByKey(9, "id")).toEqual(data[9]["id"]);
        });
        it("should throw error when cell or row is not found", function () {
            expect(function () { grid.getCellDataByKey(0,"key_from_outer_space") }).toThrowError("Cell does not exist");
            expect(function () { grid.getCellDataByKey(100,"title") }).toThrowError("Row does not exist");
        });
    });

    describe("getGridData", function () {
        it("should return grid data", function () {
            expect(grid.getGridData()).toEqual(data);
        });
    });

    describe("getRows", function () {
        it("should return all rows from table", function () {
            expect(grid.getRows().length).toEqual(10);
            expect(grid.getRows().get()).toEqual($(".sensei-grid-test>table>tbody>tr").get());
        });
    });

    describe("getCellFromRowByKey", function () {
        it("should return cell from row by key", function () {
            var $row = $(".sensei-grid-test>table>tbody>tr:first");
            var $cell = $(".sensei-grid-test>table>tbody>tr:first>td:first").get();
            expect(grid.getCellFromRowByKey($row, "id").get()).toEqual($cell);
        });
    });

    describe("getCellFromRowByIndex", function () {
        it("should return cell from row by index", function () {
            var $row = $(".sensei-grid-test>table>tbody>tr:first");
            var $cell = $(".sensei-grid-test>table>tbody>tr:first>td:first").get();
            expect(grid.getCellFromRowByIndex($row, 0).get()).toEqual($cell);
        });
    });

    describe("getRowCellsByIndex", function () {
        it("should return row cells by index", function () {
            var $cells = $(".sensei-grid-test>table>tbody>tr:first>td").get();
            expect(grid.getRowCellsByIndex(0).get()).toEqual($cells)
        });
    });

    describe("getRowCells", function () {
        it("should return row cells", function () {
            var $row = $(".sensei-grid-test>table>tbody>tr:first");
            expect(grid.getRowCells($row).get()).toEqual($row.find(">td").get());
        });
    });

    describe("getCellData", function () {
        it("should return cell data", function () {
            var $cells = $(".sensei-grid-test>table>tbody>tr:first>td");
            expect(grid.getCellData($cells.eq(0))).toBe(data[0]["id"]);
            expect(grid.getCellData($cells.eq(4))).toBe(data[0]["count"]);
        });
        it("should return data with correct type", function () {
            var $cells = $(".sensei-grid-test>table>tbody>tr:first>td");
            expect(grid.getCellData($cells.eq(0))).toEqual(jasmine.any(String));
            expect(grid.getCellData($cells.eq(4))).toEqual(jasmine.any(Number));
        });
    });

    describe("cell meta methods", function () {
        it("getCellType should return data type of cell", function () {
            var $cells = $(".sensei-grid-test>table>tbody>tr:first>td");
            expect(grid.getCellType($cells.eq(0))).toEqual("string");
            expect(grid.getCellType($cells.eq(4))).toEqual("int");
        });
        it("getCellColumn should return column name of cell", function () {
            var $cells = $(".sensei-grid-test>table>tbody>tr:last>td");
            expect(grid.getCellColumn($cells.eq(0))).toEqual("id");
            expect(grid.getCellColumn($cells.eq(1))).toEqual("created_at");
            expect(grid.getCellColumn($cells.eq(2))).toEqual("status");
            expect(grid.getCellColumn($cells.eq(3))).toEqual("title");
            expect(grid.getCellColumn($cells.eq(4))).toEqual("count");
        });
    });
});