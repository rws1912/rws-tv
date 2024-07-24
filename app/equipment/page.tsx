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
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Dialog } from '@radix-ui/react-dialog';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';


interface Item {
    id: string;
    label: string;
    type: string;
    model: string;
    description: string;
    location: string;
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
    const [items, setItems] = useState<Item[]>([]);

    const isLocalUpdateRef = useRef<boolean>(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [newTypeDialogOpen, setNewTypeDialogOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');


    useEffect(() => {
        const fetchEquipments = async () => {
            const { data, error } = await supabase
                .from('EquipmentList')
                .select();

            if (error) {
                console.error('Error fetching equipments');
            } else {
                data.sort((a, b) => a.type === b.type ? 0 : -1)
                setItems(data);
            }
        }

        const subscribeToEquipments = async () => {
            const channel = supabase.channel('equipments')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'EquipmentList'
                }, () => {
                    console.log("Updated the database")
                    if (!isLocalUpdateRef.current) {
                        fetchEquipments();
                    } else {
                        console.log("Local change for equipments");
                    }

                    isLocalUpdateRef.current = false;
                }).subscribe();

            return () => {
                supabase.removeChannel(channel);
            }
        }

        fetchEquipments();
        subscribeToEquipments();
    }, [])

    const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Item } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    const debouncedUpdateDatabase = useDebounce(async (id: string, field: keyof Item, value: string) => {
        try {
            const { data, error } = await supabase
                .from('EquipmentList')  // Replace 'items' with your actual table name
                .update({ [field]: value })
                .eq('id', id)
                .single()

            if (error) {
                throw error
            }

            console.log('Database updated successfully', data)
        } catch (error) {
            console.error('Error updating database:', error);
            // You might want to handle this error, perhaps by reverting the local state
        }
    }, 500);

    const updateItem = (id: string, field: keyof Item, value: string) => {
        isLocalUpdateRef.current = true;

        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));

        debouncedUpdateDatabase(id, field, value);
    };

    const deleteRow = async (id: string) => {
        isLocalUpdateRef.current = true;

        setItems(items.filter(item => item.id !== id));

        try {
            const { data, error } = await supabase
                .from('EquipmentList')
                .delete()
                .eq('id', id)

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Error')
        }
    };

    const insertRowBelow = async (id: string, type: string) => {
        isLocalUpdateRef.current = true;

        const index = items.findIndex(item => item.id === id);
        const newItem = {
            label: '',
            type: type,
            model: '',
            description: '',
            location: '',
        };

        try {
            // Insert the new item into Supabase
            const { data, error } = await supabase
                .from('EquipmentList')
                .insert(newItem)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // If successful, update the local state
            setItems(prevItems => [
                ...prevItems.slice(0, index + 1),
                data as Item, // Use the returned data from Supabase
                ...prevItems.slice(index + 1)
            ]);

            console.log('New row inserted successfully');
        } catch (error) {
            console.error('Error inserting new row:', error);
            isLocalUpdateRef.current = false; // Reset the flag
        }
    };

    const handleCellClick = (id: string, field: keyof Item) => {
        setEditingCell({ id, field });
    };

    const handleCellBlur = () => {
        setEditingCell(null);
    };

    const renderCell = (item: Item, field: keyof Item) => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;

        return (
            <div className="min-h-[2rem] w-full relative">
                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={item[field]}
                        onChange={(e) => updateItem(item.id, field, e.target.value)}
                        onBlur={handleCellBlur}
                        className="absolute inset-0 w-full h-full p-0 border-none focus:ring-2 focus:ring-blue-500"
                    />
                ) : (
                    <div
                        className="w-full h-full cursor-pointer p-2 absolute inset-0 overflow-hidden text-ellipsis whitespace-nowrap"
                        onClick={() => handleCellClick(item.id, field)}
                    >
                        {item[field] || <span className="text-gray-400">Click to edit</span>}
                    </div>
                )}
            </div>
        );
    };

    const groupedItems = useMemo(() => {
        const groups: { [key: string]: Item[] } = {};
        items.forEach(item => {
            if (!groups[item.type]) {
                groups[item.type] = [];
            }
            groups[item.type].push(item);
        });
        return groups;
    }, [items]);

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

    const handleAddNewItem = (type: string) => {
        // Get the last item of the group or use a default ID if the group is empty
        const lastItemOfType = groupedItems[type]?.[groupedItems[type].length - 1];
        const idToInsertAfter = lastItemOfType ? lastItemOfType.id : '0';
        insertRowBelow(idToInsertAfter, type);
    };

    const handleAddNewType = async () => {
        if (newTypeName.trim() === '') return;

        const newItem = {
            label: '',
            type: newTypeName.trim(),
            model: '',
            description: '',
            location: '',
        };

        try {
            const { data, error } = await supabase
                .from('EquipmentList')
                .insert(newItem)
                .select()
                .single();

            if (error) throw error;

            setItems(prevItems => [...prevItems, data as Item]);
            setExpandedGroups(prev => new Set(prev).add(newTypeName.trim()));
            setNewTypeName('');
            setNewTypeDialogOpen(false);
        } catch (error) {
            console.error('Error adding new type:', error);
        }
    };

    const expandAll = () => {
        const allTypes = Object.keys(groupedItems);
        setExpandedGroups(new Set(allTypes));
    }

    const collapseAll = () => {
        setExpandedGroups(new Set());
    }


    const renderGroupHeader = (type: string, count: number) => (
        <TableRow
            key={`header-${type}`}
            className="bg-gray-100 w-full"
        >
            <TableCell
                colSpan={5}
                className="py-2 px-4"
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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddNewItem(type);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );

    return (
        <div className="h-screen w-screen overflow-auto p-4">
            <div className="mb-4 flex justify-between items-center">
                <div className='flex items-center'>
                    <Link href='/'>
                        <ChevronLeft />
                    </Link>

                    <h1 className="text-2xl font-bold">Equipment List</h1>
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
                            <DialogHeader>
                                <DialogTitle>Add New Equipment Type</DialogTitle>
                                <DialogDescription>
                                    Enter the name for the new equipment type.
                                </DialogDescription>
                            </DialogHeader>
                            <Input
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value)}
                                placeholder="Enter new type name"
                            />
                            <DialogFooter>
                                <Button onClick={handleAddNewType}>Add</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <Table className="w-full">
                <TableHeader className='sticky'>
                    <TableRow>
                        <TableHead className="w-[10%]">Label</TableHead>
                        <TableHead className="w-[25%]">Model</TableHead>
                        <TableHead className="w-[30%]">Description</TableHead>
                        <TableHead className="w-[30%]">Location</TableHead>
                        <TableHead className="w-[5%] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(groupedItems).map(([type, groupItems]) => (
                        <React.Fragment key={type}>
                            {renderGroupHeader(type, groupItems.length)}
                            {expandedGroups.has(type) && groupItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{renderCell(item, 'label')}</TableCell>
                                    <TableCell>{renderCell(item, 'model')}</TableCell>
                                    <TableCell>{renderCell(item, 'description')}</TableCell>
                                    <TableCell>{renderCell(item, 'location')}</TableCell>
                                    <TableCell className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => deleteRow(item.id)}>
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => insertRowBelow(item.id, item.type)}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Insert Below
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default InventoryTable;