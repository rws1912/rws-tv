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


    const isLocalUpdateRef = useRef<boolean>(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [newTypeDialogOpen, setNewTypeDialogOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768); // Adjust this breakpoint as needed
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);


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

                // Ensure consistent cell order for each row
                const columnOrder = ['label', 'description', 'model']; // Add other column names in desired order
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

        // fetchEquipments();
        // subscribeToEquipments();

        fetchCombinedEquipments();
        subscribeToCombinedEquipments();
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
                // You might want to handle this error, perhaps by reverting the local state
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

    // const deleteRow = async (id: string) => {
    //     isLocalUpdateRef.current = true;

    //     setEquipments(equipments.filter(equipment => equipment.id !== id));

    //     try {
    //         const { data, error } = await supabase
    //             .from('equipmentRows')
    //             .delete()
    //             .eq('id', id)

    //         if (error) {
    //             throw error;
    //         }
    //     } catch (error) {
    //         console.error('Error')
    //     }
    // };
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
            // Handle error (e.g., show an error message to the user)
        }
    };

    // const insertRowBelow = async (id: string, type: string) => {
    //     isLocalUpdateRef.current = true;

    //     const index = items.findIndex(item => item.id === id);
    //     const newItem = {
    //         label: '',
    //         type: type,
    //         model: '',
    //         description: '',
    //         location: '',
    //     };

    //     try {
    //         // Insert the new item into Supabase
    //         const { data, error } = await supabase
    //             .from('EquipmentList')
    //             .insert(newItem)
    //             .select()
    //             .single();

    //         if (error) {
    //             throw error;
    //         }

    //         // If successful, update the local state
    //         setItems(prevItems => [
    //             ...prevItems.slice(0, index + 1),
    //             data as Item, // Use the returned data from Supabase
    //             ...prevItems.slice(index + 1)
    //         ]);

    //         console.log('New row inserted successfully');
    //     } catch (error) {
    //         console.error('Error inserting new row:', error);
    //         isLocalUpdateRef.current = false; // Reset the flag
    //     }
    // };
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
        // isLocalUpdateRef.current = true;
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

            // Update the local state equipments
            // setEquipments(prevEquipments: any =>
            //     prevEquipments.map(equipment => {
            //         if (equipment.type === type) {
            //             const newCell = newCells.find(cell => cell.row_id === equipment.id);
            //             return {
            //                 ...equipment,
            //                 cells: [
            //                     ...equipment.cells,
            //                     {
            //                         id: newCell.id,
            //                         column_id: newColumn.id,
            //                         name: newColumn.column_name,
            //                         row_id: equipment.id,
            //                         value: ''
            //                     }
            //                 ]
            //             };
            //         }
            //         return equipment;
            //     })
            // );

            console.log("Local state updated");

        } catch (error) {
            console.error("Error inserting new column:", error);
            // Handle error (e.g., show an error message to the user)
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
            // You might want to update your local state or trigger a re-fetch here
            // For example: await fetchCombinedEquipments();

            return data;
        } catch (error) {
            console.error('Unexpected error during column deletion:', error);
            throw error;
        }
    };

    // const groupedItems = useMemo(() => {
    //     const groups: { [key: string]: Item[] } = {};
    //     items.forEach(item => {
    //         if (!groups[item.type]) {
    //             groups[item.type] = [];
    //         }
    //         groups[item.type].push(item);
    //     });
    //     return groups;
    // }, [items]);

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

        // Sort rows within each group
        // for (const type in groups) {
        //     groups[type].sort((a, b) => {
        //         // Assuming the first cell is always present and represents the creation time of the row
        //         console.log("a", a);
        //         return new Date(a.cells[0].date_added).getTime() - new Date(b.cells[0].date_added).getTime();
        //     });
        // }

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

            // Update local state
            // setEquipments(prevItems => [...prevItems, {
            //     ...rowData,
            //     cells: [{
            //         id: cellData.id,
            //         name: columnData.column_name,
            //         value: '', // Default empty value for the new cell
            //         column_id: columnData.id
            //     }]
            // }]);
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
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    h2 {
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
        `;

        for (const [header, equipments] of Object.entries(groupedEquipments)) {
            htmlCode += `<h2>${header}</h2>`;

            if (equipments.length > 0) {
                // Extract column names from the first equipment's cells
                const columnNames = equipments[0].cells.map(cell => cell.name);

                htmlCode += `
                    <table>
                        <tr>
                            ${columnNames.map(name => `<th>${name}</th>`).join('')}
                        </tr>
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

                htmlCode += '</table>';
            }
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


    const renderGroupHeader = (type: string, count: number) => (
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
                    <span>{type} ({count})</span>
                </div>
                <div>
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
                    {renderGroupHeader(type, groupEquipments.length)}
                    {expandedGroups.has(type) && (
                        <Table className="w-full mb-4">
                            <TableHeader>
                                <TableRow>
                                    {groupEquipments.length > 0 && groupEquipments[0].cells.map((cell, index) => {
                                        const isFirstOrLast = index === 0 || index === groupEquipments[0].cells.length - 1;
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
                                        {equipment.cells.map((cell, index) => {
                                            const isFirstOrLast = index === 0 || index === equipment.cells.length - 1;
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