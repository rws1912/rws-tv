"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MoreVertical, Trash, Plus, PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/lib/supabaseClient';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, ChevronLeft, Printer, Eye } from 'lucide-react';
import { Dialog } from '@radix-ui/react-dialog';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { useToast } from "@/components/ui/use-toast";
import { Label } from '@/components/ui/label';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import print from '@/lib/print';
import { useFetchModifiedTime } from '@/lib/fetchModifiedTime';


interface Item {
    id: string;
    label: string;
    type: string;
    model: string;
    description: string;
    location: string;
}

interface Cell {
    column_id: string;
    date_added: Date;
    id: string;
    name: string;
    row_id: string;
    value: string;
}

interface ProcessedEquipmentRow {
    id: string;
    type: string;
    cells: Cell[];
}


const useDebounce = (callback: Function, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: any[]) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
};

const InventoryTable = () => {
    // const [items, setItems] = useState<Item[]>([]);
    const [equipments, setEquipments] = useState<ProcessedEquipmentRow[]>([]);
    const { toast } = useToast()

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);



    const isLocalUpdateRef = useRef<boolean>(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [newTypeDialogOpen, setNewTypeDialogOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');

    const fetchModifiedTime = useFetchModifiedTime();


    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const fetchCombinedEquipments = async () => {
            // Fetch equipment data
            const { data, error } = await supabase
                .from('equipmentRows')
                .select(`
                    id,
                    type,
                    cells:equipmentCells (
                        id,
                        column_id,
                        value,
                        row_id,
                        column:equipmentColumns (id, column_name, date_added)
                    )
                `);

            if (error) {
                console.error('Error fetching equipments:', error);
                return;
            }

            if (data) {
                const processedData: ProcessedEquipmentRow[] = data.map((object: any) => {
                    const cells = object.cells.map((cell: any) => ({
                        id: cell.id,
                        name: cell.column.column_name,
                        value: cell.value,
                        column_id: cell.column_id,
                        row_id: cell.row_id,
                        date_added: cell.column.date_added
                    }));

                    return {
                        id: object.id,
                        type: object.type,
                        cells: cells,
                    };
                });

                const columnOrder = ['label', 'description', 'model']; 
                processedData.forEach(equipment => {
                    equipment.cells.sort((a, b) => {
                        return columnOrder.indexOf(a.name) - columnOrder.indexOf(b.name);
                    });
                });

                console.log('equipments', processedData);
                setEquipments(processedData);
            }
        }

        const subscribeToCombinedEquipments = async () => {
            const channel = supabase.channel('equipment!')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'equipmentRows'
                }, () => {
                    console.log("Updated the equipmentRows table");
                    fetchModifiedTime();
                    if (!isLocalUpdateRef.current) {
                        fetchCombinedEquipments();
                    } else {
                        console.log("Local change for equipmentRows");
                    }
                    isLocalUpdateRef.current = false;
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'equipmentCells'
                }, () => {
                    console.log("Updated the equipmentCells table");
                    fetchModifiedTime();
                    if (!isLocalUpdateRef.current) {
                        fetchCombinedEquipments();
                    } else {
                        console.log("Local change for equipmentCells");
                    }
                    isLocalUpdateRef.current = false;
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'equipmentColumns'
                }, () => {
                    console.log("Updated the equipmentColumns table");
                    fetchModifiedTime();
                    if (!isLocalUpdateRef.current) {
                        fetchCombinedEquipments();
                    } else {
                        console.log("Local change for equipmentColumns");
                    }
                    isLocalUpdateRef.current = false;
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'equipmentType'
                }, () => {
                    console.log("Updated the equipmentType table");
                    fetchModifiedTime();
                    if (!isLocalUpdateRef.current) {
                        fetchCombinedEquipments();
                    } else {
                        console.log("Local change for equipmentType");
                    }
                    isLocalUpdateRef.current = false;
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            }
        }



        fetchCombinedEquipments();
        subscribeToCombinedEquipments();
        fetchModifiedTime();
    }, [])

    const [editingCell, setEditingCell] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    const debouncedUpdateDatabase = useDebounce(
        async (id: string, value: string, table = 'equipmentCells', columnToUpdate = 'value') => {
            try {
                const { data, error } = await supabase
                    .from(table)  // Update this to your actual table name
                    .update({ [columnToUpdate]: value })
                    .eq('id', id)
                    .single();

                if (error) {
                    throw error;
                }

                console.log('Database updated successfully', data);
            } catch (error) {
                console.error('Error updating database:', error);
                console.log("My itmes are", id, value, table, columnToUpdate);
            }
        },
        500
    );

    const updateItem = (rowId: string, id: string, value: string) => {
        isLocalUpdateRef.current = true;
        console.log("rowId", rowId);
        console.log("equipments", equipments);
        console.log("id", id);

        setEquipments(equipments.map(equipment =>
            equipment.id === rowId
                ? {
                    ...equipment,
                    cells: equipment.cells.map(cell =>
                        cell.id === id
                            ? { ...cell, value: value }
                            : cell
                    )
                }
                : equipment
        ));

        debouncedUpdateDatabase(id, value);
    };


    const deleteRow = async (id: string) => {
        try {
            // Find the equipment to be deleted
            const equipmentToDelete = equipments.find(eq => eq.id === id);
            if (!equipmentToDelete) {
                console.error("Equipment not found");
                return;
            }

            const typeToCheck = equipmentToDelete.type;

            // Check how many rows would remain after deletion
            const remainingRowsCount = groupedEquipments[typeToCheck].length - 1;

            // Delete the equipment row
            const { error: deleteError } = await supabase
                .from('equipmentRows')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // If this was the last row of its type, delete the type as well
            if (remainingRowsCount === 0) {
                const { error: typeDeleteError } = await supabase
                    .from('equipmentType')
                    .delete()
                    .eq('type_name', typeToCheck);

                if (typeDeleteError) throw typeDeleteError;

            }

            // Update local state
            setEquipments(prevEquipments => prevEquipments.filter(equipment => equipment.id !== id));

            console.log(`Deleted equipment with ID: ${id}`);
            if (remainingRowsCount === 0) {
                console.log(`Removed last equipment of type: ${typeToCheck}`);
            }

        } catch (error) {
            console.error("Error deleting row:", error);
        }
    };

    const insertRowBelow = async (type: string) => {
        isLocalUpdateRef.current = true;

        try {
            // Create a new row for it of type <type>
            const { data: rowData, error: rowError } = await supabase
                .from('equipmentRows')
                .insert({ type: type })
                .select()
                .single();

            if (rowError) throw rowError;

            if (rowData) {
                const rowId = rowData.id;

                // Get the columns associated for that type
                const { data: columnData, error: columnError } = await supabase
                    .from('equipmentColumns')
                    .select('*')
                    .eq('type', type);

                if (columnError) throw columnError;

                // For each of those columns, create an empty entry on equipmentCells
                if (columnData) {
                    const cellInserts = columnData.map(column => ({
                        row_id: rowId,
                        column_id: column.id
                    }));

                    const { data: cellData, error: cellError } = await supabase
                        .from('equipmentCells')
                        .insert(cellInserts)
                        .select()

                    if (cellError) throw cellError;

                    if (cellData) {
                        const newEquipment = {
                            id: rowId,
                            type: rowData.type,
                            cells: cellData
                        }

                        setEquipments(prev => [...prev, newEquipment])
                    }

                }
            }
        } catch (error) {
            console.error('Error inserting row:', error);
        }
    }

    const insertColumn = async (type: string) => {
        const rowEquipments = equipments.filter(equipment => equipment.type === type);

        try {
            // Insert the new column with an empty name to equipmentColumns
            const { data: newColumn, error: columnError } = await supabase
                .from('equipmentColumns')
                .insert({ column_name: '', type: type })
                .select()
                .single();

            if (columnError) throw columnError;

            console.log("New column created:", newColumn);

            // Go through every equipment in rowEquipments and insert new cells
            const newCellPromises = rowEquipments.map(equipment =>
                supabase
                    .from('equipmentCells')
                    .insert({ row_id: equipment.id, column_id: newColumn.id, value: '' })
                    .select()
                    .single()
            );

            const newCellsResults = await Promise.all(newCellPromises);
            const newCells = newCellsResults.map(result => result.data).filter(Boolean);

            console.log("New cells created:", newCells);

            console.log("Local state updated");

        } catch (error) {
            console.error("Error inserting new column:", error);
        } finally {
            isLocalUpdateRef.current = false;
        }
    };

    const handleCellClick = (id: string) => {
        setEditingCell(id);
    };

    const handleCellBlur = () => {
        setEditingCell(null);
    };

    const updateColumn = (rowId: string, columnId: string, value: string) => {
        isLocalUpdateRef.current = true;


        setEquipments(prevEquipments => {
            return prevEquipments.map(equipment => {
                if (equipment.id === rowId) {
                    return {
                        ...equipment,
                        cells: equipment.cells.map(cell => {
                            if (cell.column_id === columnId) {
                                return { ...cell, name: value };
                            }
                            return cell;
                        })
                    };
                }
                return equipment;
            });
        });

        console.log("state", equipments);

        debouncedUpdateDatabase(columnId, value, 'equipmentColumns', 'column_name');
    };

    const renderColumnCell = (rowId: string, cell: {
        id: string;
        name: string;
        value: string;
        column_id: string;
    }) => {

        const isEditing = editingCell === cell.column_id;

        return (
            <div className="min-h-[2rem] w-full relative">
                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={cell.name.toUpperCase()}
                        onChange={(e) => updateColumn(rowId, cell.column_id, e.target.value.toUpperCase())}
                        onBlur={handleCellBlur}
                        className="absolute inset-0 w-full h-full p-0 border-none focus:ring-2 focus:ring-blue-500"
                    />
                ) : (
                    <div
                        className="w-full h-full cursor-pointer p-2 absolute inset-0 overflow-hidden text-ellipsis whitespace-nowrap"
                        onClick={() => handleCellClick(cell.column_id)}
                    >
                        {cell.name.toUpperCase() || <span className="text-gray-400">Click to edit</span>}
                    </div>
                )}
            </div>
        )

    }

    const renderCell = (rowId: any, equipment: any) => {

        const isEditing = editingCell === equipment.id;

        return (
            <div className="min-h-[2rem] w-full relative">
                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={equipment.value.toUpperCase()}
                        onChange={(e) => updateItem(rowId, equipment.id, e.target.value.toUpperCase())}
                        onBlur={handleCellBlur}
                        className="absolute inset-0 w-full h-full p-0 border-none focus:ring-2 focus:ring-blue-500"
                    />
                ) : (
                    <div
                        className="w-full h-full cursor-pointer p-2 absolute inset-0 overflow-hidden text-ellipsis whitespace-nowrap"
                        onClick={() => handleCellClick(equipment.id)}
                    >
                        {equipment.value.toUpperCase() || <span className="text-gray-400">Click to edit</span>}
                    </div>
                )}
            </div>
        );
    };

    const deleteColumn = async (columnId: string) => {
        try {
            const { data, error } = await supabase
                .from("equipmentColumns")
                .delete()
                .eq('id', columnId);

            if (error) {
                console.error('Error deleting column:', error);
                throw error;
            }

            console.log('Column deleted successfully:', data);

            return data;
        } catch (error) {
            console.error('Unexpected error during column deletion:', error);
            throw error;
        }
    };

    const groupedEquipments = useMemo(() => {
        const groups: { [key: string]: ProcessedEquipmentRow[] } = {};

        // Helper function to sort cells within a row
        const sortCells = (cells: Cell[]): Cell[] => {
            return cells.sort((a, b) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime());
        };

        // Group equipments
        equipments.forEach(equipment => {
            if (!groups[equipment.type]) {
                groups[equipment.type] = [];
            }
            // Sort cells within the equipment
            equipment.cells = sortCells(equipment.cells);
            groups[equipment.type].push(equipment);
        });

        console.log('groups', groups);
        return groups;
    }, [equipments]);

    const toggleGroup = (type: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    };

    const handleAddNewType = async () => {
        isLocalUpdateRef.current = true;
        if (newTypeName.trim() === '') return;

        try {
            // Insert new equipment type
            const { data: typeData, error: typeError } = await supabase
                .from('equipmentType')
                .insert({ type_name: newTypeName.trim() })
                .select()
                .single();
            if (typeError) throw typeError;

            // Create a new row for that type
            const { data: rowData, error: rowError } = await supabase
                .from('equipmentRows')
                .insert({ type: newTypeName.trim() })
                .select()
                .single();

            if (rowError) throw rowError;

            // Create a default column for the new type
            const { data: columnData, error: columnError } = await supabase
                .from('equipmentColumns')
                .insert({
                    column_name: 'Column 1',
                    type: newTypeName.trim()
                })
                .select()
                .single();

            if (columnError) throw columnError;

            // Create a cell for the new row and column
            const { data: cellData, error: cellError } = await supabase
                .from('equipmentCells')
                .insert({
                    row_id: rowData.id,
                    column_id: columnData.id
                })
                .select()
                .single();

            if (cellError) throw cellError;

            console.log("Column created", columnData);
            console.log("Cell created", cellData);

            setExpandedGroups(prev => new Set(prev).add(newTypeName.trim()));
            setNewTypeName('');
            setNewTypeDialogOpen(false);

            toast({
                title: "New type added successfully",
                description: `Type '${newTypeName.trim()}' has been added with a default column.`,
            })

        } catch (error) {
            console.error('Error adding new type:', error);
            toast({
                variant: "destructive",
                title: "Error adding new type",
                description: "Ensure that the new type is unique. Please try again.",
            })
        }
    };

    const setEquipmentPrint = () => {
        let htmlCode = `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .section-container {
                    page-break-inside: avoid;
                    margin-bottom: 30px;
                }
                h2 {
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                    margin-top: 30px;
                    margin-bottom: 10px;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 3px rgba(0,0,0,0.1);
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                    color: #2c3e50;
                }
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                @media print {
                    body {
                        padding: 0;
                        max-width: none;
                    }
                    .section-container {
                        break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
    `;

        for (const [header, equipments] of Object.entries(groupedEquipments)) {
            htmlCode += `<div class="section-container"><h2>${header}</h2>`;

            if (equipments.length > 0) {
                // Extract column names from the first equipment's cells
                const columnNames = equipments[0].cells.map(cell => cell.name);

                htmlCode += `
                <table>
                    <thead>
                        <tr>
                            ${columnNames.map(name => `<th>${name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
            `;

                // Sort cells by date_added for consistent column order
                const sortedEquipments = equipments.map(equipment => ({
                    ...equipment,
                    cells: equipment.cells.sort((a, b) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime())
                }));

                for (const equipment of sortedEquipments) {
                    htmlCode += '<tr>';

                    for (const columnName of columnNames) {
                        const cell = equipment.cells.find(cell => cell.name === columnName);
                        htmlCode += `<td>${cell ? cell.value : ''}</td>`;
                    }

                    htmlCode += '</tr>';
                }

                htmlCode += `
                    </tbody>
                </table>
            `;
            }
            htmlCode += `</div>`;
        }

        htmlCode += `
        </body>
        </html>
    `;
        print(htmlCode);
    };



    const expandAll = () => {
        const allTypes = Object.keys(groupedEquipments);
        console.log("all types", allTypes);
        setExpandedGroups(new Set(allTypes));
    }

    const collapseAll = () => {
        setExpandedGroups(new Set());
    }


    const renderGroupHeader = (type: string, rows: number, columns: number) => (
        <div
            key={`header-${type}`}
            className="bg-gray-100 w-full py-2 px-4 mb-2 rounded-lg"
        >
            <div className="flex justify-between items-center w-full">
                <div
                    className="font-bold cursor-pointer flex items-center"
                    onClick={() => toggleGroup(type)}
                >
                    {expandedGroups.has(type) ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    <span>{type} ({rows})</span>
                </div>
                <div>
                    {columns < 7 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                insertColumn(type);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Column
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            insertRowBelow(type);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Row
                    </Button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="h-screen w-screen overflow-auto p-4">
            <div className="mb-4 flex justify-between items-center">
                <div className='flex items-center space-x-2'>
                    <Link href='/'>
                        <ChevronLeft />
                    </Link>
                    <h1 className="text-2xl font-bold">Equipment List</h1>
                    <Printer className="h-8 w-8 mr-2 hover:opacity-50 transition-opacity duration-300" onClick={setEquipmentPrint} />
                </div>
                <div className='items-center space-x-4'>
                    <Button variant={'outline'} onClick={expandAll}>Expand All</Button>
                    <Button variant={'secondary'} onClick={collapseAll}>Collapse All</Button>
                    <Dialog open={newTypeDialogOpen} onOpenChange={setNewTypeDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add New Type
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>x
                                <DialogTitle>Add New Equipment Type</DialogTitle>
                                <DialogDescription>
                                    Enter the name for the new equipment type.
                                </DialogDescription>
                            </DialogHeader>
                            <Input
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
                                placeholder="Enter new type name"
                            />
                            <DialogFooter>
                                <Button onClick={handleAddNewType}>Add</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            {Object.entries(groupedEquipments).map(([type, groupEquipments]) => (
                <div className="w-full" key={type}>
                    {renderGroupHeader(type, groupEquipments.length, groupEquipments[0].cells.length)}
                    {expandedGroups.has(type) && (
                        <Table className="w-full mb-4">
                            <TableHeader>
                                <TableRow className=''>
                                    {groupEquipments.length > 0 && groupEquipments[0].cells.map((cell, index, array) => {
                                        // Determine if the current cell is the first or last column
                                        const isFirstOrLast = index === 0 || index === array.length - 1;

                                        // Conditionally render the cell based on the isMobile state and if it's the first or last column
                                        if (!isMobile || isFirstOrLast) {
                                            return (
                                                <TableHead className="" key={cell.column_id}>
                                                    <ContextMenu>
                                                        <ContextMenuTrigger>
                                                            {renderColumnCell(groupEquipments[0].id, cell)}
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent>
                                                            <ContextMenuItem onClick={() => deleteColumn(cell.column_id)}>
                                                                Delete Column
                                                            </ContextMenuItem>
                                                        </ContextMenuContent>
                                                    </ContextMenu>
                                                </TableHead>
                                            );
                                        }
                                        return null;
                                    })}
                                    <TableHead className='w-2'></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupEquipments.map((equipment) => (
                                    <TableRow key={equipment.id}>
                                        {equipment.cells.map((cell, index, array) => {
                                            const isFirstOrLast = index === 0 || index === array.length - 1;
                                            if (!isMobile || isFirstOrLast) {
                                                return (
                                                    <TableCell key={cell.id}>{renderCell(equipment.id, cell)}</TableCell>
                                                );
                                            }
                                            return null;
                                        })}
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                See contents
                                                            </DropdownMenuItem>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-[425px]">
                                                            <DialogHeader>
                                                                <DialogTitle>Equipment Details</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="grid gap-4 py-4">
                                                                {equipment.cells.map((cell) => (
                                                                    <div key={cell.id} className="grid grid-cols-4 items-center gap-4">
                                                                        <Label htmlFor={cell.id} className="text-right">
                                                                            {cell.name}
                                                                        </Label>
                                                                        <div className="col-span-3">
                                                                            <Input id={cell.id} value={cell.value} readOnly />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <DropdownMenuItem onClick={() => deleteRow(equipment.id)}>
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            ))}
        </div>
    )
};

export default InventoryTable;