/**
 * sensei-grid v0.1.4
 * Copyright (c) 2014 Lauris Dzilums <lauris@discuss.lv>
 * Licensed under MIT 
*/
(function ($) {

    $.fn.grid = function (data, columns, options) {

        var plugin = this,
            defaults = {
                emptyRow: false,
                sortable: true,
                tableClass: "" // table table-bordered table-condensed
            };

        plugin.isEditing = false;

        $.fn.isOnScreen = function(){

            var win = $(window);

            var viewport = {
                top : win.scrollTop(),
                left : win.scrollLeft()
            };
            viewport.right = viewport.left + win.width();
            viewport.bottom = viewport.top + win.height();

            var bounds = this.offset();
            bounds.right = bounds.left + this.outerWidth();
            bounds.bottom = bounds.top + this.outerHeight();

            return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));

        };

        $.fn.setActiveCell = function () {
            $("tr", plugin.$el).removeClass("activeRow");
            $("tr>.activeCell", plugin.$el).removeClass("activeCell");
            $(this).addClass("activeCell");
            $(this).parent("tr").addClass("activeRow");

            // trigger cell:select event
            plugin.events.trigger("cell:select", $(this));
        };

        // fixes inconsistent position in firefox/chrome
        // for this to work a div is needed inside table cell
        $.fn.cellPosition = function () {
            var pos = $("div", this).position();
            console.log("cell pos", pos);
            pos.left = Math.round(pos.left);
            pos.top = Math.round(pos.top);
            var paddingH = $(this).outerWidth() - $(this).width();
            var paddingV = $(this).outerHeight() - $(this).height();
            pos.top -= Math.round(paddingV / 2);
            pos.left -= Math.round(paddingH / 2);
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
                    console.log("trigger event", event, e);
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

        plugin.registerEditor = function (Editor) {
            var instance = new Editor(plugin);
            plugin.editors[instance.name] = instance;
        };

        plugin.render = function () {
            console.log("render");

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
            plugin.$el.on("click", "tr>td", plugin.clickCell);
            plugin.$el.on("dblclick", "tr>td", plugin.dblClickCell);
            plugin.$el.on("blur", plugin.blur);
            plugin.$el.on("keydown", plugin.keydown);
            $(document).on("click", plugin.editorBlur);
        };

        plugin.unbindEvents = function () {
            plugin.$el.off("click", "tr>td");
            plugin.$el.off("dblclick", "tr>td");
            plugin.$el.off("blur");
            plugin.$el.off("keydown");
            $(document).off("click");
        };

        plugin.editorBlur = function (e) {
            if(plugin.$el.has($(e.target)).length === 0) {
                console.log("editorBlur -> is grid event:", plugin.$el.has($(e.target)).length);
                plugin.exitEditor();
                plugin.deactivateCell();
            }
        };

        plugin.hideEditors = function () {
            $(".sensei-grid-editor", plugin.$el).hide();
        };

        plugin.blur = function (e) {
            // check if focus has moved to editor
            console.log("blur", e.relatedTarget);
            // e.relatedTarget && plugin.$el.has($(e.relatedTarget))
            // not firefox compatible
            if (plugin.isEditing) {
                console.log("focus moved to editor");
            } else {
                console.log("grid blur, focus not on editor");
                plugin.exitEditor();
                plugin.isEditing = false;
                plugin.deactivateCell();
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

        plugin.deactivateCell = function () {
            console.log("deactivateCell");
            var $td = plugin.getActiveCell();
            $td.removeClass("activeCell");
            $td.parent("tr").removeClass("activeRow");
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

            console.log("left");
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
                    console.log("move -> edit cell", plugin.getActiveCell());
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
            console.log("editCell");
            plugin.showEditor();
        };

        plugin.getEditor = function () {
            return plugin.activeEditor;
        };

        plugin.getEditorInstance = function () {
            var $td = plugin.getActiveCell();

            var editorName = $td.data("editor");

            if (editorName && _.has(plugin.editors, editorName)) {
                console.log("getEditor", editorName);
                return plugin.editors[editorName];
            } else {
                throw Error("Editor not found: " + editorName);
            }
        };

        plugin.saveEditor = function () {
            console.log("save editor");

            // save editor if is active
            if (plugin.isEditing) {

                var $td = plugin.getActiveCell();
                var val = plugin.activeEditor.getValue();

                if (val !== $td.text()) {

                    // set value from editor to the active cell
                    $td.html($("<div>").text(val));

                    // trigger editor:save event
                    var data = {};
                    data[$td.data("column")] = val;
                    plugin.events.trigger("editor:save", data, $td);

                    // remove empty row status from current row and assure that
                    // there is at least one empty row at the end of table
                    $td.parent("tr").removeClass("sensei-grid-empty-row");
                    plugin.assureEmptyRow();
                }
            }

            // hide editor
            plugin.getEditor().hide();
        };

        plugin.assureEmptyRow = function () {
            if (plugin.config["emptyRow"] && plugin.$el.find("table>tbody>tr.sensei-grid-empty-row").length === 0) {
                var $tbody = plugin.$el.find("table>tbody");
                var $row = plugin.renderRow(null, false);
                $tbody.append($row);
            }
        };

        plugin.exitEditor = function (skipSave) {
            console.log("exit editor");
            var $td = plugin.getActiveCell();
            if (plugin.isEditing && plugin.activeEditor) {
                if (!skipSave) {
                    plugin.saveEditor();
                } else {
                    plugin.getEditor().hide();
                }
            }

            // need to regain focus
            console.log("need to regain focus on sensei-grid");
            $td.setActiveCell();
            plugin.$el.focus();

            plugin.isEditing = false;
        };

        plugin.moveEditor = function () {
            if (plugin.isEditing) {
                plugin.showEditor();
                console.log("editor is visible, move along");
                plugin.editCell(); // previously editCell was called with plugin.getActiveCell
            }
        };

        plugin.showEditor = function () {

            console.log("show editor");

            // set active editor instance
            plugin.activeEditor = plugin.getEditorInstance();

            // assign element instances
            var $editor = plugin.activeEditor.getElement();
            var $td = plugin.getActiveCell();
            plugin.activeEditor.activeCell = $td;

            // set editing mode after we have gotten active cell
            plugin.isEditing = true;

            // show editor and set correct position
            $editor.show();
            $editor.css($td.cellPosition());
            $editor.css({width: $td.outerWidth() + 1, height: $td.outerHeight() + 1});

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
                            plugin.exitEditor();
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
            console.log("clicked cell");
            if (plugin.isEditing) {
                plugin.exitEditor();
            }
            $(this).setActiveCell();
        };

        plugin.dblClickCell = function (e) {
            e.preventDefault();
            console.log("double clicked cell");
            $(this).setActiveCell();
            plugin.editCell();
        };

        plugin.renderColumns = function () {
            console.log("renderColumns");

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

                tr.appendChild(th);
            });
            $thead.append(tr);
        };

        plugin.renderData = function () {
            console.log("renderData");

            var $tbody = $("tbody", plugin.$el);
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
            console.log("renderBaseTable");

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
            console.log("sensei grid init");
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

(function ($) {
    var root = this;

    var Editor = function (grid) {
        this.grid = grid;
    };
    Editor.extend = function (props) {
        var parent = this;
        var child;

        child = function () {
            return parent.apply(this, arguments);
        };

        var Surrogate = function () {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate();

        if (props) {
            _.extend(child.prototype, props);
        }

        child.__super__ = parent.prototype;

        return child;
    };
    Editor.prototype.getElement = function () {
        return $(this.editor);
    };
    Editor.prototype.initialize = function () {
    };
    Editor.prototype.render = function () {
    };
    Editor.prototype.show = function () {
        this.getElement().show();
    };
    Editor.prototype.hide = function () {
        console.log("Editor hide");
        this.getElement().hide();
        this.grid.activeEditor.activeCell = null;
        this.grid.activeEditor = null;
    };
    Editor.prototype.getValue = function () {
        console.warn("Editor.getValue not implemented");
    };
    Editor.prototype.setValue = function () {
        console.warn("Editor.setValue not implemented");
    };

    // export editor
    root.Editor = Editor;

    root.BasicEditor = Editor.extend({
        types: [],
        name: "BasicEditor",
        render: function () {
            console.log("BasicEditor.render");

            if (!this.editor) {
                this.editor = document.createElement("div");
                this.editor.className = "sensei-grid-editor sensei-grid-basic-editor";
                var input = document.createElement("input");
                this.editor.appendChild(input);
                this.grid.$el.append(this.editor);
            }
        },
        getValue: function () {
            return $("input", this.editor).val();
        },
        setValue: function (val) {
            $("input", this.editor).val(val).focus();
        }
    });
})(jQuery);