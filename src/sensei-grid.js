(function ($) {

    // @TODO need to refactor event model. For example, avoid forced focus on grid,
    // just set a mode (active/inactive) instead.
    // key events should be global not specific to sensei grid, thus no focus would be needed
    // on sensei grid for them to work.
    // current event model and forced focus causes grid to get scrolled in area
    // when editor moves/closes which is unnecessary

    $.fn.grid = function (data, columns, options) {

        var plugin = this,
            defaults = {
                emptyRow: false,
                sortable: true,
                tableClass: "table table-bordered table-condensed"
            };

        plugin.isEditing = false;
        plugin.$prevRow = null;
        plugin.editorProps = {};
        plugin.preventEnter = false;

        $.fn.isOnScreen = function () {

            var win = $(window);

            var viewport = {
                top: win.scrollTop(),
                left: win.scrollLeft()
            };
            viewport.right = viewport.left + win.width();
            viewport.bottom = viewport.top + win.height();

            var bounds = this.offset();
            bounds.right = bounds.left + this.outerWidth();
            bounds.bottom = bounds.top + this.outerHeight();

            return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));

        };

        /**
         * Force redraw on element
         * @param $el
         */
        var redraw = function ($el) {
            var el = $el.get(0);
            var d = el.style.display;

            // actual code that will force redraw of element
            el.style.display = "none";
            el.offsetHeight; // jshint ignore:line
            el.style.display = d;
        };

        /**
         * Normalize line endings
         * @param text
         * @returns string
         */
        var normalizeLineEndings = function (text) {
            return text.replace(/\r\n/g, "\n");
        };

        $.fn.setActiveCell = function () {
            plugin.$prevRow = $("tr>.activeCell", plugin.$el).parent("tr");
            plugin.$prevRow.removeClass("activeRow");

            $("tr>.activeCell", plugin.$el).removeClass("activeCell");
            $(this).addClass("activeCell");
            $(this).parent("tr").addClass("activeRow");

            // redraw element to fix border style in firefox
            // this should be called only for firefox, can cause performance issues on large grids
            redraw($(this).parent("tr"));

            // trigger cell:select event
            plugin.events.trigger("cell:select", $(this));

            if (plugin.$prevRow.index() !== $(this).parent("tr").index()) {
                plugin.events.trigger("row:select", $(this).parent("tr"));
                if (plugin.$prevRow.hasClass("sensei-grid-dirty-row") && plugin.isEditing) {
                    plugin.events.trigger("row:save", plugin.getRowData(plugin.$prevRow), plugin.$prevRow, "row:select");
                }
            }
        };

        // fixes inconsistent position in firefox/chrome
        // for this to work a div is needed inside table cell
        $.fn.cellPosition = function () {

            var pos = $(this).position();

            // if browser is firefox or similar, fix table cell position
            // firefox calculates cell positions differently from webkit browsers
            if (plugin.isSillyFirefox()) {
                pos.left -= 1;
                pos.top -= 1;
            }

            return pos;
        };

        plugin.events = {_events: {}};
        plugin.events.on = function (event, callback, context) {
            if (!_.has(this._events, event)) {
                this._events[event] = [];
            }
            this._events[event].push({callback: callback, context: context});
        };
        plugin.events.trigger = function (event) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (_.has(this._events, event)) {
                var events = this._events[event];
                _.each(events, function (e) {
                    var cbk = _.bind(e["callback"], e["context"]);
                    cbk.apply(this, args);
                });
            }
        };
        plugin.events.off = function (event) {
            if (_.has(this._events, event)) {
                delete this._events[event];
            }
        };

        plugin.isSillyFirefox = function () {
            var tableLeft = plugin.$el.position().left;
            var cellLeft = plugin.$el.find("td:first").position().left;
            return cellLeft !== tableLeft;
        };

        plugin.registerEditor = function (Editor) {
            var instance = new Editor(plugin);
            plugin.editors[instance.name] = instance;
        };

        plugin.render = function () {
            plugin.renderBaseTable();
            plugin.renderColumns();
            plugin.renderData();

            // render each editor
            _.each(plugin.editors, function (editor) {
                editor.initialize();
                editor.render();
                editor.getElement().hide();
            });

            plugin.bindEvents();
        };

        plugin.destroy = function () {
            plugin.unbindEvents();
            plugin.$el.remove();
        };

        plugin.bindEvents = function () {
            // unbind previous events
            plugin.unbindEvents();

            plugin.$el.on("click.grid", "tr>td", plugin.clickCell);
            plugin.$el.on("dblclick.grid", "tr>td", plugin.dblClickCell);
            plugin.$el.on("blur.grid", plugin.blur);
            plugin.$el.on("keydown.grid", plugin.keydown);
            plugin.$el.on("click.grid", "tr>th.sensei-grid-sortable", plugin.sort);
            $(document).on("click.grid", plugin.editorBlur);
        };

        plugin.unbindEvents = function () {
            plugin.$el.off(".grid");
            $(document).off(".grid");
        };

        plugin.sort = function () {
            // get column value
            var col = $(this).text();
            var order = "asc";

            // remove previous sorting icon
            plugin.$el.find("th.sensei-grid-sortable .glyphicon").remove();

            if ($(this).data("order") && $(this).data("order") === "asc") {
                order = "desc";
                // add sorting icon
                $(this).append($("<span>").addClass("glyphicon glyphicon-chevron-up"));
            } else {
                // add sorting icon
                $(this).append($("<span>").addClass("glyphicon glyphicon-chevron-down"));
            }

            // save sort order
            $(this).data("order", order);

            // trigger callback
            plugin.events.trigger("column:sort", col, order, $(this));

            plugin.renderData();
        };

        plugin.editorBlur = function (e) {
            if (plugin.getActiveCell().length > 0 && plugin.$el.has($(e.target)).length === 0) {
                plugin.exitEditor();
                plugin.deactivateCell();
            }
        };

        plugin.hideEditors = function () {
            $(".sensei-grid-editor", plugin.$el).hide();
        };

        plugin.blur = function () {
            // check if focus has moved to editor
            // e.relatedTarget && plugin.$el.has($(e.relatedTarget))
            // not firefox compatible
            if (plugin.getActiveCell().length > 0 && !plugin.isEditing) {
                var $td = plugin.getActiveCell();
                plugin.exitEditor();
                plugin.isEditing = false;
                plugin.deactivateCell();

                // force redraw on last active row
                redraw($td.parent("tr"));
            }
        };

        // core parsers for cell values
        plugin.parsers = {};
        plugin.parsers["string"] = function (val) {
            return val.toString();
        };
        plugin.parsers["int"] = function (val) {
            return parseInt(val);
        };
        plugin.parsers["float"] = function (val) {
            return parseFloat(val);
        };

        plugin.getCellData = function ($cell) {
            var value = $cell.text();
            var type = plugin.getCellType($cell);

            // parse value according to defined cell type
            if (_.has(plugin.parsers, type)) {
                value = plugin.parsers[type](value);
            }

            return value;
        };

        plugin.getCellColumn = function ($cell) {
            return $cell.data("column");
        };

        plugin.getCellType = function ($cell) {
            return $cell.data("type");
        };

        plugin.getCellStatus = function ($cell) {
            return !!$cell.data("saved");
        };

        plugin.getCellDataByIndex = function (row, cell) {
            var $row = plugin.getRowByIndex(row);
            var $cell = plugin.getCellFromRowByIndex($row, cell);
            return plugin.getCellData($cell);
        };

        plugin.getCellDataByKey = function (row, key) {
            var $row = plugin.getRowByIndex(row);
            var $cell = plugin.getCellFromRowByKey($row, key);
            return plugin.getCellData($cell);
        };

        plugin.getCellFromRowByIndex = function ($row, index) {
            var $cell = $row.find("td").eq(index);
            if ($cell.length === 0) {
                throw new Error("Cell does not exist");
            }

            return $cell;
        };

        plugin.getCellFromRowByKey = function ($row, key) {

            var $cell = $row.find("td").filter(function () {
                return $(this).data("column") === key;
            });
            if ($cell.length === 0) {
                throw new Error("Cell does not exist");
            }

            return $cell;
        };

        plugin.getCellRow = function ($cell) {
            return $cell.parent("tr");
        };

        plugin.getRowCellsByIndex = function (index) {
            return plugin.getRowByIndex(index).find("td");
        };

        plugin.getRowCells = function ($row) {
            return $row.find("td");
        };

        plugin.getRowByIndex = function (index) {
            var $row = plugin.$el.find("tbody>tr").eq(index);
            if ($row.length === 0) {
                throw new Error("Row does not exist");
            }

            return $row;
        };

        plugin.getRowDataByIndex = function (index) {
            var $row = plugin.getRowByIndex(index);
            return plugin.getRowData($row);
        };

        plugin.getRowData = function ($row) {

            // get all cells from row
            var $cells = plugin.getRowCells($row);

            // get data from each cell
            var data = {};
            $cells.each(function () {
                data[plugin.getCellColumn($(this))] = plugin.getCellData($(this));
            });
            return data;
        };

        plugin.getRows = function () {
            return plugin.$el.find("tbody>tr");
        };

        plugin.getGridData = function () {
            var $rows = plugin.getRows();
            return $rows.map(function () {
                return plugin.getRowData($(this));
            }).get();
        };

        plugin.getActiveCell = function () {
            // if editor is active, get active cell from it
            if (plugin.isEditing && plugin.activeEditor && plugin.activeEditor.activeCell) {
                return plugin.activeEditor.activeCell;
            }
            return $("td.activeCell", plugin.$el);
        };

        plugin.setRowSaved = function ($row) {
            $row.removeClass("sensei-grid-dirty-row").removeClass("sensei-grid-empty-row");
            $row.find(">td").data("saved", true);
        };

        plugin.deactivateCell = function () {
            var $td = plugin.getActiveCell();
            $td.removeClass("activeCell");
            $td.parent("tr").removeClass("activeRow");

            // trigger cell:deactivate event
            plugin.events.trigger("cell:deactivate", $td);
        };

        plugin.clearActiveCell = function () {
            var $td = plugin.getActiveCell();
            var oldValue = plugin.getCellData($td);
            $(">div", $td).empty();

            // trigger cell:clear event
            plugin.events.trigger("cell:clear", oldValue, $td);
        };

        plugin.moveRight = function () {

            var $td = plugin.getActiveCell();

            if ($td.next().length > 0) {
                $td.next().setActiveCell();
            } else {
                // try next row
                var $nextRow = $td.parent("tr").next();
                if ($nextRow.length > 0) {
                    $("td:first", $nextRow).setActiveCell();
                }
            }
        };

        plugin.moveUp = function () {

            var $td = plugin.getActiveCell();

            var $prevRow = $td.parent("tr").prev();
            if ($prevRow.length > 0) {
                var index = $td.index();
                var $upCell = $("td", $prevRow).eq(index);
                if ($upCell.length > 0) {
                    $upCell.setActiveCell();
                } else {
                    $("td:last", $prevRow).setActiveCell();
                }
            }
        };

        plugin.moveLeft = function () {

            var $td = plugin.getActiveCell();

            if ($td.prev().length > 0) {
                $td.prev().setActiveCell();
            } else {
                // try next row
                var $prevRow = $td.parent("tr").prev();
                if ($prevRow.length > 0) {
                    $("td:last", $prevRow).setActiveCell();
                }
            }
        };

        plugin.moveDown = function () {

            var $td = plugin.getActiveCell();

            var $nextRow = $td.parent("tr").next();
            if ($nextRow.length > 0) {
                var index = $td.index();
                var $downCell = $("td", $nextRow).eq(index);
                if ($downCell.length > 0) {
                    $downCell.setActiveCell();
                } else {
                    $("td:first", $nextRow).setActiveCell();
                }
            }
        };

        plugin.move = function (direction) {
            var directionMethod = "move" + direction.charAt(0).toUpperCase() + direction.substr(1);
            if (_.has(plugin, directionMethod)) {

                // move active cell
                plugin[directionMethod]();

                if (plugin.isEditing) {
                    // save & hide editor
                    plugin.saveEditor();
                }

                if (plugin.isEditing) {
                    // show editor for currently active cell
                    plugin.editCell();
                }

                // scroll cell into viewport if it is not already visible
                if (!plugin.getActiveCell().find(">div").isOnScreen()) {
                    if (_.contains(["up", "left"], direction)) {
                        plugin.getActiveCell().get(0).scrollIntoView(true);
                    } else {
                        plugin.getActiveCell().get(0).scrollIntoView(false);
                    }
                }

            } else {
                console.warn("move method not found", directionMethod);
            }
        };

        plugin.editCell = function () {
            // currently this function is just a wrapper around showEditor
            plugin.showEditor();
        };

        plugin.getEditor = function () {
            return plugin.activeEditor;
        };

        plugin.getEditorInstance = function () {
            var $td = plugin.getActiveCell();

            var editorName = $td.data("editor");

            if (editorName && _.has(plugin.editors, editorName)) {
                // check if there is props for this editor
                var col = plugin.getCellColumn($td);
                if (_.has(plugin.editorProps, col)) {
                    plugin.editors[editorName].props = plugin.editorProps[col];
                }
                return plugin.editors[editorName];
            } else {
                throw Error("Editor not found: " + editorName);
            }
        };

        plugin.saveEditor = function () {

            // save editor if is active
            if (plugin.isEditing) {

                var $td = plugin.getActiveCell();
                var val = plugin.activeEditor.getValue();

                if (normalizeLineEndings(val) !== normalizeLineEndings($td.text())) {

                    // set value from editor to the active cell
                    $td.html($("<div>").text(val));

                    // trigger editor:save event
                    var data = {};
                    data[$td.data("column")] = val;
                    plugin.events.trigger("editor:save", data, $td);

                    // remove empty row status from current row and assure that
                    // there is at least one empty row at the end of table
                    var $tr = $td.parent("tr");
                    if ($tr.hasClass("sensei-grid-empty-row")) {
                        $tr.removeClass("sensei-grid-empty-row").addClass("sensei-grid-dirty-row");
                        plugin.assureEmptyRow();
                    }
                }
            }

            // hide editor
            plugin.getEditor().hide();
        };

        plugin.assureEmptyRow = function () {
            if (plugin.config["emptyRow"] && plugin.$el.find(">table>tbody>tr.sensei-grid-empty-row").length === 0) {
                var $tbody = plugin.$el.find(">table>tbody");
                var $row = plugin.renderRow(null, false);
                $tbody.append($row);
            }
        };

        plugin.exitEditor = function (skipSave) {
            var $td = plugin.getActiveCell();
            if (plugin.isEditing && plugin.activeEditor) {
                if (!skipSave) {
                    plugin.saveEditor();

                    var $row = $td.parent("tr");
                    // if the row was dirty, save it as a whole
                    if ($row.hasClass("sensei-grid-dirty-row") && plugin.isEditing) {
                        plugin.events.trigger("row:save", plugin.getRowData($row), $row, "editor:close");
                    }

                } else {
                    plugin.getEditor().hide();
                }
            }

            // need to regain focus
            if (plugin.isEditing) {
                $td.setActiveCell();
                plugin.$el.focus();
            }

            plugin.isEditing = false;
        };

        plugin.moveEditor = function () {
            if (plugin.isEditing) {
                plugin.showEditor();
                plugin.editCell();
            }
        };

        plugin.showEditor = function () {

            // set active editor instance
            plugin.activeEditor = plugin.getEditorInstance();

            // assign element instances
            var $editor = plugin.activeEditor.getElement();
            var $td = plugin.getActiveCell();
            plugin.activeEditor.activeCell = $td;

            // set editing mode after we have gotten active cell
            plugin.isEditing = true;

            // show editor and set correct position
            plugin.activeEditor.show();
            $editor.css($td.cellPosition());
            plugin.activeEditor.setDimensions($td);

            // set value in editor
            var column = $td.data("column");
            var value = $td.text();
            plugin.activeEditor.setValue(value);

            // trigger editor:load event
            var data = {};
            data[column] = value;
            plugin.events.trigger("editor:load", data, $td);

            return $editor;
        };

        plugin.keydown = function (e) {

            var preventDefault = true;

            // all keyCodes that will be used
            var codes = [8, 9, 13, 27, 37, 38, 39, 40];

            // specific keyCodes that won't be hijacked from the editor
            var editorCodes = [8, 37, 38, 39, 40];

            if ((plugin.getActiveCell().length === 0 && !plugin.isEditing) || !_.contains(codes, e.which)) {
                return;
            }

            if (plugin.isEditing && _.contains(editorCodes, e.which)) {
                return;
            } else {
                e.preventDefault();
            }

            switch (e.which) {
                case 37: // left
                    plugin.move("left");
                    break;
                case 38: // up
                    plugin.move("up");
                    break;
                case 39: // right
                    plugin.move("right");
                    break;
                case 40: // down
                    plugin.move("down");
                    break;
                case 13: // enter
                    // the code below must be refactored
                    if (plugin.isEditing) {
                        if (e.ctrlKey && e.shiftKey) {
                            plugin.move("up");
                        } else if (e.ctrlKey && !e.shiftKey) {
                            plugin.move("down");
                        } else {
                            if (!plugin.preventEnter) {
                                plugin.exitEditor();
                            }
                        }
                    } else {
                        plugin.editCell();
                    }
                    break;
                case 27: // esc
                    if (plugin.isEditing) {
                        plugin.exitEditor(true);
                    } else {
                        // remove focus from grid
                        plugin.$el.blur();
                    }
                    break;
                case 9: // tab
                    if (e.shiftKey) {
                        plugin.move("left");
                    } else {
                        plugin.move("right");
                    }
                    break;
                case 8: // backspace
                    plugin.clearActiveCell();
                    break;
            }

            if (preventDefault) {
                e.preventDefault();
            }
        };

        plugin.clickCell = function (e) {
            e.preventDefault();
            if (plugin.isEditing) {
                plugin.exitEditor();
            }
            $(this).setActiveCell();
        };

        plugin.dblClickCell = function (e) {
            e.preventDefault();
            $(this).setActiveCell();
            plugin.editCell();
        };

        plugin.renderColumns = function () {
            var $thead = $("thead", plugin.$el);
            var tr = document.createElement("tr");
            _.each(plugin.columns, function (column) {
                var th = document.createElement("th");
                var div = document.createElement("div");

                if (plugin.config["sortable"]) {
                    th.className = "sensei-grid-sortable";
                }

                $(div).text(column.name);
                th.appendChild(div);

                $(th).data("type", column.type || "string");
                $(th).data("editor", column.editor || "BasicEditor");

                if (column.editorProps) {
                    plugin.editorProps[column.name] = column.editorProps;
                }

                tr.appendChild(th);
            });
            $thead.append(tr);
        };

        plugin.renderData = function () {
            var $tbody = $("tbody", plugin.$el);

            // remove existing content from tbody
            $tbody.html(null);

            _.each(plugin.data, function (item) {
                var tr = plugin.renderRow(item, true);
                $tbody.append(tr);
            });

            if (plugin.config["emptyRow"]) {
                // render empty row at the end of table
                var tr = plugin.renderRow(null, false);
                $tbody.append(tr);
            }
        };

        plugin.renderRow = function (item, saved) {
            var tr = document.createElement("tr");

            if (!saved) {
                tr.className = "sensei-grid-empty-row";
            }

            _.each(plugin.columns, function (column) {
                var td = document.createElement("td");
                var div = document.createElement("div");

                if (_.has(item, column.name)) {
                    $(div).text(item[column.name]);
                }

                $(td).data("column", column.name);
                $(td).data("type", column.type || "string");
                $(td).data("editor", column.editor || "BasicEditor");
                $(td).data("saved", saved);

                td.appendChild(div);
                tr.appendChild(td);
            });
            return tr;
        };

        plugin.renderBaseTable = function () {
            var table = document.createElement("table");
            var thead = document.createElement("thead");
            var tbody = document.createElement("tbody");

            table.appendChild(thead);
            table.appendChild(tbody);
            table.className = plugin.config.tableClass;

            plugin.$el.html(table);
            plugin.$el.attr("tabindex", -1);
        };

        plugin.init = function (data, columns, options) {
            plugin.config = $.extend({}, defaults, options);
            plugin.data = data;
            plugin.columns = columns;
            plugin.$el = $(this);
            plugin.editors = {};
            return plugin;
        };

        return plugin.init(data, columns, options);
    };
})(jQuery);
